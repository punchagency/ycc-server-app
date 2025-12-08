export const contactUsNotification = `
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
      <tr>
        <td align="center">
          <table width="600px" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <h1 style="color: #0077b6; font-size: 22px; margin: 0;">New Contact Message</h1>
                <p style="color: #555555; font-size: 15px; margin: 10px 0;">A user submitted a new message from the contact form.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px; background-color: #f8f9fa; border-radius: 6px; margin: 20px 0;">
                <h3 style="color: #333333; font-size: 16px; margin: 0 0 15px 0;">Details</h3>
                <table width="100%" cellpadding="5" cellspacing="0">
                  <tr>
                    <td style="color: #555555; font-size: 14px; width: 160px;"><strong>Full Name:</strong></td>
                    <td style="color: #333333; font-size: 14px;">{{fullName}}</td>
                  </tr>
                  <tr>
                    <td style="color: #555555; font-size: 14px;"><strong>Email:</strong></td>
                    <td style="color: #333333; font-size: 14px;">{{email}}</td>
                  </tr>
                  <tr>
                    <td style="color: #555555; font-size: 14px;"><strong>Subject:</strong></td>
                    <td style="color: #333333; font-size: 14px;">{{subject}}</td>
                  </tr>
                  {{#if location}}
                  <tr>
                    <td style="color: #555555; font-size: 14px;"><strong>Location:</strong></td>
                    <td style="color: #333333; font-size: 14px;">{{location}}</td>
                  </tr>
                  {{/if}}
                  <tr>
                    <td style="color: #555555; font-size: 14px;"><strong>Submitted At:</strong></td>
                    <td style="color: #333333; font-size: 14px;">{{submittedAt}}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 20px;">
                <h3 style="color: #333333; font-size: 16px; margin: 0 0 10px 0;">Message</h3>
                <div style="white-space: pre-wrap; color: #333333; font-size: 14px; line-height: 1.6; background:#ffffff; border: 1px solid #e9ecef; border-radius: 6px; padding: 12px;">
                  {{message}}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 20px 0; color: #999999; font-size: 12px;">
                <p style="margin: 0;">© 2025 Yacht Crew Center. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
