import Joi from 'joi'

export const auctionValidation = {
  createOrUpdate: Joi.object({
    latLng: Joi.string(),
    location: Joi.string(),
    title: Joi.string(),
    startAt: Joi.alternatives().try(Joi.date(), Joi.string()).optional().allow(null, ''),
    expiresAt: Joi.alternatives().try(Joi.date(), Joi.string()).optional().allow(null, ''),
    description: Joi.string().allow(null, '').optional(),
    price: Joi.number().optional().allow(null),
    reversePrice: Joi.number().optional().allow(null),
    hasReversePrice: Joi.boolean().optional().allow(null),
    allowOffers: Joi.boolean().optional().allow(null),
    auctionFormat: Joi.string().valid('auction', 'buy_it_now').optional().allow(null),
    youtubeLink: Joi.string().optional().allow(null, ''),
    hasCustomStartingPrice: Joi.boolean().optional().allow(null),
    condition: Joi.string().optional().allow(null),
    mainCategoryId: Joi.string(),
    subCategoryId: Joi.string(),
    initialCurrencyId: Joi.string().optional().allow(null, ''),
    assetsToKeep: Joi.string().optional().allow(null, ''),
    files: Joi.any(),
  }),
}
