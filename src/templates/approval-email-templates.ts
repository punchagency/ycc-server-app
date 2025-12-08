export const vendorApprovalEmailTemplate = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; background: #fff; padding: 20px; margin: auto; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #0077b6; text-align: center;">Hello {{businessName}},</h2>
    
    <div style="margin: 20px 0;">
        {{emailBody}}
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{onboardingUrl}}" 
            style="background-color: #0077b6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Proceed to get onboarded
        </a>

        <div style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px; border: 1px solid #dee2e6;">
        <p style="margin: 0; font-size: 12px; color: #666; margin-bottom: 5px;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="margin: 0; font-size: 12px; color: #0077b6; word-break: break-all; font-family: monospace;">{{onboardingUrl}}</p>
        </div>
    </div>

    <p style="text-align: center; color: #666; font-size: 14px;">
        If you have any questions, please contact us at support@yachtcrewcenter.com
    </p>

    <p style="text-align: center; font-weight: bold; margin-top: 20px;">
        Best regards,<br>Yacht Crew Center Team
    </p>
    </div>
</div>`;

export const vendorRejectionEmailTemplate = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; background: #fff; padding: 20px; margin: auto; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #0077b6; text-align: center;">Hello {{businessName}},</h2>
    
    <div style="margin: 20px 0;">
        {{emailBody}}
    </div>

    <p style="text-align: center; color: #666; font-size: 14px;">
        If you have any questions or would like to discuss this further, please contact us at support@yachtcrewcenter.com
    </p>

    <p style="text-align: center; font-weight: bold; margin-top: 20px;">
        Best regards,<br>Yacht Crew Center Team
    </p>
    </div>
</div>`;

export const sendApprovalEmail = `
        <div>
            <h3>Hello, {{firstName}},</h3>
            <p>Congratulations! Your account has been approved. You can now log in.</p>
            <a href="https://yourwebsite.com/login">Click here to login</a>
            <p>Best regards,<br>Your Team</p>
        </div>`

export const sendRejectionEmail = `
        <div>
            <h3>Hello {{firstName}},</h3>
            <p>Unfortunately, your account registration has been rejected.</p>
            <p><strong>Reason:</strong> {{rejectionReason}}</p>
            <p>If you believe this was a mistake, you can contact support.</p>
            <p>Best regards,<br>Yacht Crew Central</p>
        </div>`;