import { Request, Response } from 'express'
import { GENERAL } from '../../constants/errors.js'
import VerificationRequestsRepository from './repository.js'
import { FCMNotificationService } from '../../lib/notifications/index.js'
import { Account } from '../accounts/model.js'

export class VerificationRequestsController {
  public static async submitVerificationRequest(req: Request, res: Response) {
    const { account } = res.locals

    try {
      // Check if user already has a pending verification request
      const hasPending = await VerificationRequestsRepository.hasPendingVerificationRequest(account.id)
      if (hasPending) {
        return res.status(400).json({ error: 'You already have a pending verification request' })
      }

      const {
        firstName,
        lastName,
        address,
        city,
        state,
        zipCode,
        mobileNumber,
        dateOfBirth,
        country,
        idCardImageUrl,
        extractedData,
      } = req.body

      // Validate required fields
      if (!firstName || !lastName || !address || !city || !state || !zipCode || !mobileNumber || !dateOfBirth || !country || !idCardImageUrl) {
        return res.status(400).json({ error: 'All fields are required' })
      }

      // Create verification request with automatic approval
      const verificationRequest = await VerificationRequestsRepository.createVerificationRequest({
        accountId: account.id,
        firstName,
        lastName,
        address,
        city,
        state,
        zipCode,
        mobileNumber,
        dateOfBirth,
        country,
        idCardImageUrl,
        extractedData,
      })

      // Automatically approve the verification request
      await VerificationRequestsRepository.updateVerificationRequestStatus(
        verificationRequest.id,
        'approved',
        'Automatically approved after successful ID verification',
        'system'
      )

      // Update the account's verification status immediately
      await Account.update(
        {
          verified: true,
          verifiedAt: new Date(),
          verificationRequestedAt: new Date(),
        },
        {
          where: { id: account.id },
        }
      )

      // Send success notification to the user
      try {
        await FCMNotificationService.sendSystemNotification(
          [account.id],
          {
            en: 'ID Verification Successful!',
            ro: 'Verificarea ID a reușit!',
            fr: 'Vérification d\'identité réussie !',
            de: 'ID-Verifizierung erfolgreich!',
            it: 'Verifica ID riuscita!',
            es: '¡Verificación de identidad exitosa!',
            ja: 'ID認証が成功しました！',
          },
          {
            en: 'Congratulations! Your account has been verified successfully. You now have a verified badge on your profile.',
            ro: 'Felicitări! Contul tău a fost verificat cu succes. Acum ai un badge de verificare pe profilul tău.',
            fr: 'Félicitations ! Votre compte a été vérifié avec succès. Vous avez maintenant un badge de vérification sur votre profil.',
            de: 'Herzlichen Glückwunsch! Ihr Konto wurde erfolgreich verifiziert. Sie haben jetzt ein Verifizierungsabzeichen auf Ihrem Profil.',
            it: 'Congratulazioni! Il tuo account è stato verificato con successo. Ora hai un badge di verifica sul tuo profilo.',
            es: '¡Felicitaciones! Tu cuenta ha sido verificada exitosamente. Ahora tienes una insignia de verificación en tu perfil.',
            ja: 'おめでとうございます！アカウントが正常に認証されました。プロフィールに認証バッジが表示されます。',
          }
        )
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError)
        // Don't fail the request if notification fails
      }

      res.status(201).json({
        success: true,
        message: 'ID verification successful! Your account has been verified.',
        verificationRequestId: verificationRequest.id,
        verified: true,
      })
    } catch (error) {
      console.error('Error submitting verification request:', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getPendingVerificationRequests(req: Request, res: Response) {
    try {
      const verificationRequests = await VerificationRequestsRepository.getPendingVerificationRequests()
      res.status(200).json({
        success: true,
        verificationRequests,
      })
    } catch (error) {
      console.error('Error getting pending verification requests:', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async getVerificationRequestById(req: Request, res: Response) {
    const { id } = req.params

    try {
      const verificationRequest = await VerificationRequestsRepository.getVerificationRequestById(id)
      if (!verificationRequest) {
        return res.status(404).json({ error: 'Verification request not found' })
      }

      res.status(200).json({
        success: true,
        verificationRequest,
      })
    } catch (error) {
      console.error('Error getting verification request:', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }

  public static async updateVerificationRequestStatus(req: Request, res: Response) {
    const { id } = req.params
    const { status, adminNotes } = req.body
    const { account } = res.locals

    try {
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' })
      }

      const [updatedCount, updatedRequests] = await VerificationRequestsRepository.updateVerificationRequestStatus(
        id,
        status,
        adminNotes,
        account.id
      )

      if (updatedCount === 0) {
        return res.status(404).json({ error: 'Verification request not found' })
      }

      const verificationRequest = updatedRequests[0]

      // Send notification to the user about the status update
      try {
        const title = status === 'approved'
          ? {
            en: 'Verification Approved',
            ro: 'Verificare aprobată',
            fr: 'Vérification approuvée',
            de: 'Verifizierung genehmigt',
            it: 'Verifica approvata',
            es: 'Verificación aprobada',
            ja: '認証が承認されました',
          }
          : {
            en: 'Verification Rejected',
            ro: 'Verificare respinsă',
            fr: 'Vérification rejetée',
            de: 'Verifizierung abgelehnt',
            it: 'Verifica respinta',
            es: 'Verificación rechazada',
            ja: '認証が拒否されました',
          }

        const description = status === 'approved'
          ? {
            en: 'Congratulations! Your account has been verified successfully.',
            ro: 'Felicitări! Contul tău a fost verificat cu succes.',
            fr: 'Félicitations ! Votre compte a été vérifié avec succès.',
            de: 'Herzlichen Glückwunsch! Ihr Konto wurde erfolgreich verifiziert.',
            it: 'Congratulazioni! Il tuo account è stato verificato con successo.',
            es: '¡Felicitaciones! Tu cuenta ha sido verificada exitosamente.',
            ja: 'おめでとうございます！アカウントが正常に認証されました。',
          }
          : {
            en: 'Your verification request has been rejected. Please review and resubmit.',
            ro: 'Cererea ta de verificare a fost respinsă. Te rugăm să o revizuiești și să o retrimiți.',
            fr: 'Votre demande de vérification a été rejetée. Veuillez la réviser et la soumettre à nouveau.',
            de: 'Ihre Verifizierungsanfrage wurde abgelehnt. Bitte überprüfen und erneut einreichen.',
            it: 'La tua richiesta di verifica è stata respinta. Per favore rivedi e reinvia.',
            es: 'Tu solicitud de verificación ha sido rechazada. Por favor revisa y envía nuevamente.',
            ja: '認証リクエストが拒否されました。確認して再提出してください。',
          }

        await FCMNotificationService.sendSystemNotification(
          [verificationRequest.accountId],
          title,
          description
        )
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError)
        // Don't fail the request if notification fails
      }

      res.status(200).json({
        success: true,
        message: `Verification request ${status} successfully`,
        verificationRequest: updatedRequests[0],
      })
    } catch (error) {
      console.error('Error updating verification request status:', error)
      res.status(500).send({ error: GENERAL.SOMETHING_WENT_WRONG })
    }
  }
}
