import { Review } from '../../modules/reviews/model.js'

export const createReviewResource = () => {
  return {
    resource: Review,
    options: {
      navigation: {
        name: 'User data',
        icon: 'User',
      },
      actions: {
        new: {
          isVisible: false,
          isAccessible: false,
        },
        bulkDelete: {
          isAccessible: ({ currentAdmin }) => currentAdmin.role === 'admin',
        },
        delete: {
          isAccessible: ({ currentAdmin }) => currentAdmin.role === 'admin',
        },
        edit: {
          isAccessible: ({ currentAdmin }) => currentAdmin.role === 'admin',
        },
      },
      showProperties: [
        'id',
        'fromAccountId',
        'toAccountId',
        'auctionId',
        'stars',
        'description',
        'createdAt',
        'updatedAt',
      ],
      listProperties: [
        'fromAccountId',
        'toAccountId',
        'auctionId',
        'stars',
        'description',
        'createdAt',
      ],
      filterProperties: [
        'id',
        'fromAccountId',
        'toAccountId',
        'auctionId',
        'stars',
        'createdAt',
      ],
      editProperties: ['stars', 'description'],
    },
  }
}
