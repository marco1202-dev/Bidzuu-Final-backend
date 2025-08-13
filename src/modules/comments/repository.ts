import { Transaction } from 'sequelize'
import { DatabaseConnection } from '../../database/index.js'
import { GenericRepository } from '../../lib/base-repository.js'
import { Account } from '../accounts/model.js'
import { Comment } from './entity.js'

class CommentsRepository extends GenericRepository<Comment> {
  constructor() {
    super(Comment)
  }

  public async countForAuction(auctionId: string) {
    return Comment.count({ where: { auctionId } })
  }

  public async getAllForAuction(auctionId: string) {
    return Comment.findAll({
      where: { auctionId, parentCommentId: null },
      include: [
        { model: Account, attributes: ['id', 'name', 'email', 'picture', 'verified'] },
        {
          model: Comment,
          as: 'replies',
          include: [{ model: Account, attributes: ['id', 'name', 'email', 'picture', 'verified'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    })
  }

  public async deleteComment(commentId: string) {
    return await DatabaseConnection.getInstance().transaction(async (transaction: Transaction) => {
      await Comment.destroy({ where: { parentCommentId: commentId }, transaction })
      await Comment.destroy({ where: { id: commentId }, transaction })
    })
  }

  public async createAndReturnWithDetails(comment: Partial<Comment>) {
    const createdComment = await Comment.create(comment)

    return Comment.findOne({
      where: { id: createdComment.id },
      include: [{ model: Account }],
    })
  }
}

const commentsRepoInstance = new CommentsRepository()
Object.freeze(commentsRepoInstance)

export { commentsRepoInstance as CommentsRepository }
