import { Op, Transaction } from 'sequelize'
import { DATABASE_MODELS } from '../../constants/model-names.js'
import { DatabaseConnection } from '../../database/index.js'
import { GenericRepository } from '../../lib/base-repository.js'
import { PaginatedQueryParams } from '../../types.js'
import { Account } from '../accounts/model.js'
import { Auction } from '../auctions/model.js'
import { CategoriesRepository } from '../categories/repository.js'
import { FavouritesRepository } from '../favourites/repository.js'
import { AuctionSimilarity } from './model.js'
import { AuctionsRepository } from '../auctions/repository.js'

const MIN_SIMILARITY = 0.25

const SIMILARITY_WEIGHTS = {
  titleWeight: 0.4,
  descriptionWeight: 0.3,
  categoryWeight: 0.1,
  subCategoryWeight: 0.1,
  locationWeight: 0.1,
}

class AuctionSimilarityRepository extends GenericRepository<AuctionSimilarity> {
  constructor() {
    super(AuctionSimilarity)
  }

  public async getSimilarAuctions(auctionId: string, params?: PaginatedQueryParams) {
    const { page = 0, perPage = 20 } = params || {}

    const similaritiesQuery = `
      SELECT
        "a"."id" AS "auctionId",
        "s"."similarity"
      FROM
        ${DATABASE_MODELS.AUCTIONS} "a"
      JOIN
        (
          SELECT
            CASE
                WHEN "auctionId1" = :auctionId THEN "auctionId2"
                ELSE "auctionId1"
            END AS "relatedAuctionId",
            "similarity"
          FROM
            ${DATABASE_MODELS.AUCTION_SIMILARITIES}
          WHERE
            ("auctionId1" = :auctionId OR "auctionId2" = :auctionId)
            AND "similarity" >= ${MIN_SIMILARITY}
        ) "s" ON "a"."id" = "s"."relatedAuctionId"
      WHERE
        "a"."expiresAt" > NOW()
        AND "a"."acceptedBidAt" IS NULL
        AND "a"."id" != :auctionId
      ORDER BY
        "s"."similarity" DESC
      LIMIT :limit OFFSET :offset;
    `

    const similarities = await DatabaseConnection.getInstance().query(similaritiesQuery, {
      replacements: { auctionId, limit: perPage, offset: page * perPage },
    })

    const auctionIds: string[] = similarities[0].map((similarity) => similarity.auctionId)

    const uniqueAuctionIds = Array.from(new Set(auctionIds)).filter((el) => el !== auctionId)
    return AuctionsRepository.findByIds(uniqueAuctionIds)
  }

  public async getRecommendations(account: Account, params?: PaginatedQueryParams) {
    const { page = 0, perPage = 20 } = params || {}
    const [favouriteAuctions, categoriesVectors] = await Promise.all([
      FavouritesRepository.getFavouriteAuctions(account.id),
      CategoriesRepository.getVectorsForCategories(account.preferredCategoriesIds),
    ])

    const favouriteAuctionIds = favouriteAuctions.map((favourite) => favourite.auction.id)
    const favouritesVectors = favouriteAuctions.map((favourite) => favourite.auction.vectors)

    if (!favouritesVectors.length && !categoriesVectors.length) {
      return []
    }

    const isFavouriteAuctionIdsEmpty = favouriteAuctionIds.length === 0
    const query = `
      WITH similarity_scores AS (
        SELECT
          s."auctionId2" AS id,
          COALESCE(AVG(s.similarity), 0) AS aggregated_similarity
        FROM
          ${DATABASE_MODELS.AUCTIONS} a
        LEFT JOIN
          auction_similarities s ON s."auctionId2" = a.id 
          AND ${isFavouriteAuctionIdsEmpty ? '1=1' : 's."auctionId1" = ANY(:favouriteAuctionIds)'}
        WHERE a."accountId" != :userAccountId
          AND a."expiresAt" >= NOW()
          AND a."acceptedBidId" IS NULL
         ${isFavouriteAuctionIdsEmpty && account.preferredCategoriesIds.length
        ? 'AND a."mainCategoryId" = ANY(:preferredCategoryIds)'
        : ''
      } 
        GROUP BY
          s."auctionId2"
      ),
      preferred_category_scores AS (
        SELECT
          a.id,
          (
            (
              SELECT COALESCE(SUM(uv * av), 0)
              FROM UNNEST(array[:preferredCategoryVectors]::float8[], 
                (SELECT array_agg((value->>0)::float8) 
                  FROM jsonb_array_elements(a.vectors->'categoryVector') AS value)) AS t(uv, av)
            ) * :categoryWeight
          ) AS category_similarity
        FROM
          ${DATABASE_MODELS.AUCTIONS} a
        WHERE
          a."accountId" != :userAccountId
      ),
      combined_scores AS (
        SELECT
          ss.id,
          pcs.category_similarity as category_similarity,
          COALESCE(ss.aggregated_similarity, 0) + COALESCE(pcs.category_similarity, 0) AS total_similarity
        FROM
          similarity_scores ss
        LEFT JOIN
          preferred_category_scores pcs ON ss.id = pcs.id
      )
      SELECT id, total_similarity, category_similarity
      FROM combined_scores
      WHERE total_similarity >= ${MIN_SIMILARITY}
      ORDER BY total_similarity DESC
      LIMIT :limit OFFSET :offset;
    `

    const replacements = {
      favouriteAuctionIds: `{${favouriteAuctionIds.join(',')}}`,
      preferredCategoryVectors: categoriesVectors.flat(),
      preferredCategoryIds: `{${account.preferredCategoriesIds.join(',')}}`,
      userAccountId: account.id,
      limit: perPage,
      offset: page * perPage,
      categoryWeight: SIMILARITY_WEIGHTS.categoryWeight,
    }

    const auctions = await DatabaseConnection.getInstance().query(query, {
      replacements,
    })

    const auctionIds = auctions[0].map((auction) => auction.id)
    return AuctionsRepository.findByIds(auctionIds)
  }

  public async updateSimilaritiesForAuction(
    auction: Auction,
    transaction?: Transaction,
    commitTransaction = true
  ) {
    transaction = transaction || (await DatabaseConnection.getInstance().transaction())

    try {
      const allAuctions = await Auction.findAll({
        where: {
          id: { [Op.ne]: auction.id },
          expiresAt: { [Op.gte]: new Date() },
          acceptedBidId: null,
        },
        attributes: ['id', 'vectors'],
        transaction,
      })

      const similarities = []

      for (const otherAuction of allAuctions) {
        if (auction.id === otherAuction.id) {
          continue
        }

        const titleSimilarity = this.computeCosineSimilarity(
          auction.vectors.titleVector,
          otherAuction.vectors.titleVector
        )
        const descriptionSimilarity = this.computeCosineSimilarity(
          auction.vectors.descriptionVector,
          otherAuction.vectors.descriptionVector
        )
        const categorySimilarity = this.computeCosineSimilarity(
          auction.vectors.categoryVector,
          otherAuction.vectors.categoryVector
        )
        const subCategorySimilarity = this.computeCosineSimilarity(
          auction.vectors.subCategoryVector,
          otherAuction.vectors.subCategoryVector
        )
        const locationSimilarity = this.computeCosineSimilarity(
          auction.vectors.locationVector,
          otherAuction.vectors.locationVector
        )

        const similarity =
          titleSimilarity * SIMILARITY_WEIGHTS.titleWeight +
          (auction.description?.length
            ? descriptionSimilarity * SIMILARITY_WEIGHTS.descriptionWeight
            : 0) +
          categorySimilarity * SIMILARITY_WEIGHTS.categoryWeight +
          subCategorySimilarity * SIMILARITY_WEIGHTS.subCategoryWeight +
          locationSimilarity * SIMILARITY_WEIGHTS.locationWeight

        similarities.push({
          auctionId1: auction.id,
          auctionId2: otherAuction.id,
          similarity,
        })

        // Also store the reverse similarity
        similarities.push({
          auctionId1: otherAuction.id,
          auctionId2: auction.id,
          similarity,
        })
      }

      // Delete existing similarities
      await AuctionSimilarity.destroy({
        where: {
          [Op.or]: { auctionId1: auction.id, auctionId2: auction.id },
        },
        transaction,
      })

      // Insert new similarities
      await AuctionSimilarity.bulkCreate(similarities, { transaction })

      if (commitTransaction) {
        await transaction.commit()
      }
    } catch (error) {
      if (commitTransaction) {
        console.error('Coult not commit transaction - update similarities', error)
        await transaction.rollback()
      } else {
        throw error
      }
    }
  }

  public computeCosineSimilarity(vectorA: number[], vectorB: number[]) {
    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0)
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0))
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0))
    if (magnitudeA === 0 || magnitudeB === 0) return 0
    return dotProduct / (magnitudeA * magnitudeB)
  }
}

const auctionSimilarityRepositoryInstance = new AuctionSimilarityRepository()
Object.freeze(auctionSimilarityRepositoryInstance)

export { auctionSimilarityRepositoryInstance as AuctionSimilarityRepository }
