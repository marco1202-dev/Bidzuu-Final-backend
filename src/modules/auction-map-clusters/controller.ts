import { Request, Response } from 'express'
import { GENERAL } from '../../constants/errors.js'
import { AuctionMapClustersRepository } from './repository.js'
import { Op } from 'sequelize'

export class AuctionMapClustersController {
  public static async getAll(req: Request, res: Response) {
    try {
      const auctionMapClusters = await AuctionMapClustersRepository.findAll({
        where: {
          expiresAt: {
            [Op.gte]: new Date(),
          },
        },
      })
      return res.status(200).send(auctionMapClusters)
    } catch (error) {
      console.error(`Could not get all auction map clusters`, error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }
}
