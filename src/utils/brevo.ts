/**
 * Standalone Brevo Transactional Email Engine
 * Uses Brevo (v3 API) to dispatch SMTP emails.
 */

export async function sendBrevoEmail(toEmail: string, subject: string, htmlContent: string): Promise<void> {
  const apiKey = import.meta.env.VITE_BREVO_API_KEY || "";
  const endpoint = "https://api.brevo.com/v3/smtp/emails";

  if (!apiKey) {
    console.warn("Brevo API key (VITE_BREVO_API_KEY) is missing. Email dispatch skipped.");
    return;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "ApexOps Enterprise Suite",
          email: "noreply@apexops.com",
        },
        to: [{ email: toEmail }],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Direct Brevo email dispatch failed (HTTP ${response.status}):`, errorText);
    } else {
      console.log(`Direct Brevo email successfully dispatched to ${toEmail}`);
    }
  } catch (error) {
    console.error("Network error executing direct Brevo email dispatch:", error);
  }
}

/**
 * Premium glassmorphic HTML email template generator
 */
export function getOtpHtml(fullName: string, otpCode: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ApexOps Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #020817; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #020817; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
              <!-- Header -->
              <tr>
                <td style="padding: 30px 40px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">ApexOps <span style="color: #6366f1;">SAP Hub</span></h1>
                  <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Security Verification Portal</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px 40px 30px 40px;">
                  <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #e2e8f0;">Hello ${fullName},</p>
                  <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #94a3b8;">You have initiated the deployment of an Enterprise Instance. Please enter the following 6-digit verification code to complete your security handshake:</p>
                  
                  <div style="text-align: center; margin: 30px 0; padding: 20px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px;">
                    <span style="font-family: 'JetBrains Mono', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #6366f1; text-shadow: 0 0 12px rgba(99, 102, 241, 0.4);">${otpCode}</span>
                  </div>
                  
                  <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 20px; color: #f43f5e; font-weight: 500;">Note: This verification code is valid for 15 minutes. Do not share this credential with anyone.</p>
                  <p style="margin: 0; font-size: 14px; line-height: 20px; color: #94a3b8;">If you did not request this code, you can safely ignore this email.</p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center; background: rgba(15, 23, 42, 0.2);">
                  <p style="margin: 0; font-size: 12px; color: #64748b;">&copy; 2026 ApexOps &middot; Enterprise SAP Operations Hub &middot; Secured by Brevo v3</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function getClientWelcomeHtml(clientEmail: string, uniqueId: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to ApexOps SAP Hub</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #020817; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #020817; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
              <!-- Header -->
              <tr>
                <td style="padding: 30px 40px; background: linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">ApexOps <span style="color: #06b6d4;">SAP Hub</span></h1>
                  <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">B2B Workspace Onboarding</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px 40px 30px 40px;">
                  <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #e2e8f0;">Hello,</p>
                  <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #94a3b8;">Your active project workspace has been successfully established on the ApexOps Enterprise platform. Here are your credentials to access the secure B2B Client Portal:</p>
                  
                  <div style="margin: 25px 0; padding: 25px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 12px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Login Email Address:</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 20px; font-size: 16px; font-weight: 700; color: #ffffff;">${clientEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Unique Project ID (Password Token):</td>
                      </tr>
                      <tr>
                        <td style="font-family: 'JetBrains Mono', Courier, monospace; font-size: 18px; font-weight: 800; color: #06b6d4; letter-spacing: 0.5px;">${uniqueId}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">To log in, visit the welcome page, click <strong>Client Portal</strong>, and authenticate using the credentials above.</p>
                  
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 10px 0 25px 0;">
                    <tr>
                      <td align="center">
                        <table border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center" style="border-radius: 12px;" bgcolor="#06b6d4">
                              <a href="https://apexops-sap-hub.vercel.app" target="_blank" style="font-size: 14px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 12px; padding: 12px 28px; border: 1px solid #06b6d4; display: inline-block; font-weight: 700;">Enter Client Command Portal</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 0; font-size: 13px; line-height: 20px; color: #64748b;">If you need assistance during the onboarding phase, your assigned specialist team can be reached directly via the portal support desk.</p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center; background: rgba(15, 23, 42, 0.2);">
                  <p style="margin: 0; font-size: 12px; color: #64748b;">&copy; 2026 ApexOps &middot; Enterprise SAP Operations Hub &middot; Secured by Brevo v3</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function getEmployeeAssignmentHtml(employeeName: string, projectName: string, projectId: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ApexOps Project Allocation</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #020817; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #020817; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
              <!-- Header -->
              <tr>
                <td style="padding: 30px 40px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">ApexOps <span style="color: #8b5cf6;">SAP Hub</span></h1>
                  <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Workspace Assignment System</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px 40px 30px 40px;">
                  <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #e2e8f0;">Hello ${employeeName},</p>
                  <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #94a3b8;">You have been officially allocated to a new live project workspace by the system administrator. Please review the allocation details:</p>
                  
                  <div style="margin: 25px 0; padding: 25px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Assigned Project Name:</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 20px; font-size: 16px; font-weight: 700; color: #ffffff;">${projectName}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Project Token / Unique ID:</td>
                      </tr>
                      <tr>
                        <td style="font-family: 'JetBrains Mono', Courier, monospace; font-size: 15px; font-weight: 700; color: #8b5cf6;">${projectId}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">Log into your Specialist Employee Hub to check for newly opened incident tickets, SLA tracking parameters, and client communication channels associated with this workspace.</p>
                  
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 10px 0 25px 0;">
                    <tr>
                      <td align="center">
                        <table border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center" style="border-radius: 12px;" bgcolor="#8b5cf6">
                              <a href="https://apexops-sap-hub.vercel.app" target="_blank" style="font-size: 14px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 12px; padding: 12px 28px; border: 1px solid #8b5cf6; display: inline-block; font-weight: 700;">Enter Specialist Operations Hub</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center; background: rgba(15, 23, 42, 0.2);">
                  <p style="margin: 0; font-size: 12px; color: #64748b;">&copy; 2026 ApexOps &middot; Enterprise SAP Operations Hub &middot; Secured by Brevo v3</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
