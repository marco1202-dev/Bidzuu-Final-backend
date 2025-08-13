import { ComponentLoader } from 'adminjs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const componentLoader = new ComponentLoader()

export const customComponents = {
  SettingsEditPage: componentLoader.add('SettingsEditPage', path.join(__dirname, 'components/settings/edit-page.tsx')),
  AllCategoriesSelect: componentLoader.add(
    'AllCategoriesSelect',
    path.join(__dirname, 'components/categories/all-parents-select.tsx')
  ),
  ParentCategoryNameWithLabel: componentLoader.add(
    'ParentCategoryNameWithLabel',
    path.join(__dirname, 'components/categories/parent-category-with-label.tsx')
  ),
  CustomCategorySelect: componentLoader.add(
    'CustomCategorySelect',
    path.join(__dirname, 'components/categories/parent-category-select.tsx')
  ),
  ParentCategoryName: componentLoader.add(
    'ParentCategoryName',
    path.join(__dirname, 'components/categories/parent-category-name.tsx')
  ),
  SimpleInput: componentLoader.add('SimpleInput', path.join(__dirname, 'components/common/input.tsx')),
  TranslatedValue: componentLoader.add('TranslatedValue', path.join(__dirname, 'components/common/translated-value.tsx')),
  JsonbField: componentLoader.add('JsonbField', path.join(__dirname, 'components/common/jsonb.tsx')),
  JsonbFieldList: componentLoader.add('JsonbFieldList', path.join(__dirname, 'components/common/jsonb-list.tsx')),
  CustomAction: componentLoader.add('CustomAction', path.join(__dirname, 'components/custom-action.tsx')),
  EditTextarea: componentLoader.add('EditTextarea', path.join(__dirname, 'components/common/edit-textarea.tsx')),
  CustomCategoryIconList: componentLoader.add(
    'CustomCategoryIconList',
    path.join(__dirname, 'components/categories/custom-icon-list.tsx')
  ),
  AccountAvatar: componentLoader.add('AccountAvatar', path.join(__dirname, 'components/accounts/avatar.tsx')),
  AssetImage: componentLoader.add('AssetImage', path.join(__dirname, 'components/assets/image.tsx')),
  AssetSize: componentLoader.add('AssetSize', path.join(__dirname, 'components/assets/size.tsx')),
  AssetDropzone: componentLoader.add('AssetDropzone', path.join(__dirname, 'components/assets/dropzone.tsx')),
  AuctionCategoryCard: componentLoader.add(
    'AuctionCategoryCard',
    path.join(__dirname, 'components/auctions/category-card.tsx')
  ),
  AuctionAssets: componentLoader.add('AuctionAssets', path.join(__dirname, 'components/auctions/assets.tsx')),
  AuctionAssetsCarousel: componentLoader.add(
    'AuctionAssetsCarousel',
    path.join(__dirname, 'components/auctions/assets-carousel.tsx')
  ),
  BulkDeleteButton: componentLoader.add(
    'BulkDeleteButton',
    path.join(__dirname, 'components/common/bulk-delete-button.tsx')
  ),
  CustomCategoryIconEdit: componentLoader.add(
    'CustomCategoryIconEdit',
    path.join(__dirname, 'components/categories/custom-icon.tsx')
  ),
  CategoryUploadedIcon: componentLoader.add('CategoryUploadedIcon', path.join(__dirname, 'components/categories/icon.tsx')),
  SendAccountNotificationModal: componentLoader.add(
    'SendAccountNotificationModal',
    path.join(__dirname, 'components/accounts/send-notification-modal.tsx')
  ),
  DashboardPage: componentLoader.add('DashboardPage', path.join(__dirname, 'components/dashboard/index.tsx')),
}

export default componentLoader
