export const congratulationTemplateLocal = (
  redirect_url: string,
  role: string,
  full_name: string,
  email: string,
) => {
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
                  <td style="padding-bottom: 20px;">Platform Link: <a href="${redirect_url}" style="color: #000abc;">${redirect_url}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px;">Role: ${role}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 30px;">
                      Email: <b>${email}</b>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>
  
    `;
};
