import { Router } from 'express'
import { crearBannerHttp, editarBannerHttp, eliminarBannerHttp, listarBannersHttp } from '../controllers/bannerController.js'

const router = Router()

router.route('/banners').get(listarBannersHttp).post(crearBannerHttp)
router.route('/banners/:id').patch(editarBannerHttp).delete(eliminarBannerHttp)

export default router
