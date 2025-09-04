export const congratulationTemplate = (
  redirect_url: string,
  role: string,
  full_name: string,
  email: string,
) => {
  const roleLower = role.toLowerCase();

  const roleBasedParagraphs: Record<string, string> = {
    "company manager": `After you have set your password, you would be able to login & use the system by setting up facilities & chillers. Also manage facility managers and operators assign them chillers to start logging in the chiller readings.`,
    "facility manager": `After you have set your password, you would be able to login & use the system by setting up chillers. Also manage operators, assign them chillers to start logging in the chiller readings.`,
    operator: `After you have set your password, you would be able to login & use the system to manage the log entries for the assigned chillers.`,
    "sub admin": `After you have set your password, you would be able to login & use the system.`,
  };

  const additionalInstructions = roleBasedParagraphs[roleLower] || "";
  return `
    <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Set Password</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap"
        rel="stylesheet"
      />
    </head>
    <body style="padding: 0; margin: 0; font-family: Roboto">
      <table
        style="
          background-color: #fff;
          width: 650px;
          margin: 0 auto;
          max-width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          padding: 47px 50px 28px;
          display: block;
        "
      >
        <thead>
      <tr>
          <td style="text-align: center;max-height: 75px;">
              <a href="javascript:void(0)" target="_blank" style="display: inline-block;padding: 22px 0px;">
                  <img src="${process.env.LOGO_URL}" alt="logo"
                      style="width:100%;height:45px">
              </a>
          </td>
      </tr>
          <tr>
            <td>
              <table
                style="
                  width: 100%;
                  border-collapse: collapse;
                  table-layout: fixed;
                "
              >
                <tr>
                  <td
                    style="
                      vertical-align: middle;
                      text-align: center;
                      padding-bottom: 57px;
                      width: 100%;
                    "
                  >
                    <span
                      style="
                        border-bottom: 1px solid #00a86b;
                        font-weight: 500;
                        font-size: 20px;
                        line-height: 24px;
                        color: rgba(0, 0, 0, 0.85);
                        padding-bottom: 10px;
                      "
                      >Account Created Successfully</span
                    >
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <table
                style="
                  vertical-align: middle;
                  width: 100%;
                  color: #333333;
                  font-weight: 400;
                  font-size: 14px;
                  line-height: 131%;
                  padding-bottom: 30px;
                "
              >
                <tr>
                  <td style="padding-bottom: 20px;">Hi ${full_name},</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">Welcome to Chiller Check.</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">We are very excited to have you onboard.</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">Your account has been successfully created.</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">You can access the system by your registered email.</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 0px;">Platform Link: <a href="${redirect_url}" style="color: #000abc;">${redirect_url}.</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 0px;">Role: ${role}.</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">
                      Email: <b>${email}.</b>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">You can now set your password by clicking the button below.</td>
                </tr>
                <tr>
                  <td style="text-align: center;padding-bottom: 35px;">
                  <a href="${redirect_url}">
                    <button
                      style="
                        background: #000abc;
                        font-size: 14px;
                        font-weight: 700;
                        color: #fff;
                        border-radius: 30px;
                        padding: 6.5px 35px;
                        border: none;
                        cursor: pointer;
                      "
                    >
                      Set Password
                    </button>
                    <a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">
                    <span
                      >${additionalInstructions}</span
                    >
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">
                    <span
                      >Please note that the option to set your password will expire within 24 hours.</span
                    >
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">
                    <span
                      >If the password link has expired, you can reach out to your superior to generate a new password link & share it. Else email to us at support@chillercheck.com</span
                    >
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>
              <table
                style="
                  width: 100%;
                  border-collapse: collapse;
                  table-layout: fixed;
                "
              >
            <tr>
                <td style="padding:45px 50px 60px;">
                    <table style="border: 0;border-spacing:0;">
                        <tr>
                            <td style="font-weight: 600;font-size: 17px;color: #404040;line-height: 23px;">
                                Thanks, <span style="display: block;">The Chiller Check Team</span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding:0 ;">
                    <table style="border: 0;border-spacing:0;width: 100%;text-align: center;">
                        <tr>
                            <td style="padding:10px;background-color: #13132A;font-weight: 400;font-size: 13px;letter-spacing: 0.5px;color: #FFFFFF;">
                                Copyright ©2025 Chiller Check | All Rights Reserved
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
              </table>
            </td>
          </tr>
        </tfoot>
      </table>
    </body>
  </html>
  
    `;
};
