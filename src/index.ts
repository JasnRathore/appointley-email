import { Hono } from 'hono'
import { logger } from 'hono/logger'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config() // Fallback to .env

const app = new Hono()

app.use('*', logger())

// SMTP configuration from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
})

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('[Email Service] SMTP Connection Error:', error)
  } else {
    console.log('[Email Service] SMTP Server is ready to take messages')
  }
})

app.get('/', (c) => {
  return c.text('Appointley Email Service is running')
})

app.post('/send', async (c) => {
  const body = await c.req.json()
  const { recipient, senderName, subject } = body
  
  console.log(`[Email Service] Attempting to send email to: ${recipient}, Subject: ${subject}`)

  try {
    if (!recipient || !subject || !body.body) {
      console.warn(`[Email Service] Validation failed for request to ${recipient}`)
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const info = await transporter.sendMail({
      from: `${senderName || 'Appointley'} <${process.env.MAIL_FROM || process.env.MAIL_USERNAME}>`,
      to: recipient,
      subject: subject,
      text: body.body,
    })

    console.log(`[Email Service] Success: Message sent to ${recipient}. ID: ${info.messageId}`)
    return c.json({ success: true, messageId: info.messageId })
  } catch (error: any) {
    console.error(`[Email Service] Critical Failure: Failed to send email to ${recipient}`, error)
    return c.json({ error: 'Failed to send email', details: error.message }, 500)
  }
})

export default app
