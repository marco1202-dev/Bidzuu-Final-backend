import { VerificationRequest } from '../../modules/verification-requests/model.js'
import { customComponents } from '../component-loader.js'

export const createVerificationRequestsResource = () => {
  return {
    resource: VerificationRequest,
    options: {
      properties: {
        id: {
          type: 'string',
          isVisible: {
            filter: true,
            show: true,
            edit: false,
            list: true,
          },
        },
        accountId: {
          type: 'string',
          isVisible: {
            filter: true,
            show: true,
            edit: false,
            list: true,
          },
        },
        firstName: {
          type: 'string',
          isVisible: {
            filter: true,
            show: true,
            edit: false,
            list: true,
          },
        },
        lastName: {
          type: 'string',
          isVisible: {
            filter: true,
            show: true,
            edit: false,
            list: true,
          },
        },
        address: {
          type: 'string',
          isVisible: {
            filter: false,
            show: true,
            edit: false,
            list: false,
          },
        },
        city: {
          type: 'string',
          isVisible: {
            filter: true,
            show: true,
            edit: false,
            list: true,
          },
        },
        state: {
          type: 'string',
          isVisible: {
            filter: true,
            show: true,
            edit: false,
            list: true,
          },
        },
        zipCode: {
          type: 'string',
          isVisible: {
            filter: false,
            show: true,
            edit: false,
            list: false,
          },
        },
        mobileNumber: {
          type: 'string',
          isVisible: {
            filter: false,
            show: true,
            edit: false,
            list: false,
          },
        },
        dateOfBirth: {
          type: 'string',
          isVisible: {
            filter: false,
            show: true,
            edit: false,
            list: false,
          },
        },
        country: {
          type: 'string',
          isVisible: {
            filter: true,
            show: true,
            edit: false,
            list: true,
          },
        },
        idCardImageUrl: {
          type: 'string',
          components: {
            show: customComponents.AssetImage,
            list: customComponents.AssetImage,
          },
          isVisible: {
            filter: false,
            show: true,
            edit: false,
            list: true,
          },
        },
        extractedData: {
          type: 'mixed',
          components: {
            show: customComponents.JsonbField,
            list: customComponents.JsonbFieldList,
          },
          isVisible: {
            filter: false,
            show: true,
            edit: false,
            list: false,
          },
        },
        status: {
          type: 'select',
          availableValues: [
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ],
          isVisible: {
            filter: true,
            show: true,
            edit: true,
            list: true,
          },
        },
        adminNotes: {
          type: 'textarea',
          isVisible: {
            filter: false,
            show: true,
            edit: true,
            list: false,
          },
        },
        reviewedBy: {
          type: 'string',
          isVisible: {
            filter: false,
            show: true,
            edit: false,
            list: false,
          },
        },
        reviewedAt: {
          type: 'datetime',
          isVisible: {
            filter: false,
            show: true,
            edit: false,
            list: false,
          },
        },
        createdAt: {
          type: 'datetime',
          isVisible: {
            filter: true,
            show: true,
            edit: false,
            list: true,
          },
        },
        updatedAt: {
          type: 'datetime',
          isVisible: {
            filter: false,
            show: true,
            edit: false,
            list: false,
          },
        },
      },
      navigation: {
        name: 'Verification',
        icon: 'Shield',
      },
      notes: {
        new: 'Verification requests are automatically approved upon successful ID verification. This section shows the history of all verification requests.',
      },
      listProperties: [
        'id',
        'firstName',
        'lastName',
        'city',
        'state',
        'country',
        'status',
        'idCardImageUrl',
        'createdAt',
      ],
      showProperties: [
        'id',
        'accountId',
        'firstName',
        'lastName',
        'address',
        'city',
        'state',
        'zipCode',
        'mobileNumber',
        'dateOfBirth',
        'country',
        'idCardImageUrl',
        'extractedData',
        'status',
        'adminNotes',
        'reviewedBy',
        'reviewedAt',
        'createdAt',
        'updatedAt',
      ],
      editProperties: [
        'status',
        'adminNotes',
      ],
      actions: {
        new: {
          isVisible: false,
          isAccessible: false,
        },
        edit: {
          isAccessible: ({ currentAdmin }) => currentAdmin.role === 'admin',
        },
        delete: {
          isVisible: false,
          isAccessible: false,
        },
        bulkDelete: {
          isVisible: false,
          isAccessible: false,
        },
        approve: {
          actionType: 'record',
          component: false,
          isAccessible: ({ currentAdmin, record }) =>
            currentAdmin.role === 'admin' && record.params.status === 'pending',
          handler: async (request, response, context) => {
            const { record } = context
            await record.update({ status: 'approved' })
            return {
              record: record.toJSON(context.currentAdmin),
              notice: {
                message: 'Verification request approved successfully',
                type: 'success',
              },
            }
          },
        },
        reject: {
          actionType: 'record',
          component: false,
          isAccessible: ({ currentAdmin, record }) =>
            currentAdmin.role === 'admin' && record.params.status === 'pending',
          handler: async (request, response, context) => {
            const { record } = context
            await record.update({ status: 'rejected' })
            return {
              record: record.toJSON(context.currentAdmin),
              notice: {
                message: 'Verification request rejected successfully',
                type: 'success',
              },
            }
          },
        },
      },
    },
  }
}
