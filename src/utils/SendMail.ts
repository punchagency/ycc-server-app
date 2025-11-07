import 'dotenv/config';
import SendGrid from "@sendgrid/mail";
import { logCritical } from './SystemLogs';


const SendMail = async ({ email, subject, html }: { email: string | string[], subject: string, html: string }) => {
    try {
        if (!email || !subject || !html) {
            console.log('Missing required email parameters');
            throw new Error('Missing required email parameters');
        }

        // Set SendGrid API key
        SendGrid.setApiKey(process.env.SENDGRID_API_KEY || "");

        const msg = {
            to: Array.isArray(email) ? email : [email],
            from: process.env.SENDGRID_FROM_EMAIL || "", // Verified sender email
            subject: subject,
            html: html,
        };

        await SendGrid.send(msg);

        return true;
    } catch (error: any) {
        logCritical({ message: 'Email sending failed', source: 'SendMail', error })
        throw new Error(`Email sending failed: ${error.message}`);
    }
}

export default SendMail;