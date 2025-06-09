export const connectUsTemplate = (
  full_name: string,
  mobile_number: string,
  user_role: string,
  company_strength: string,
  email: string,
  question: string,
  logo: string,
) =>
  `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Inter Harbour</title>
    </head>
    
    <body style="font-family: 'Inter', sans-serif;">
        <table name="main" class="main" border="0" cellpadding="0" cellspacing="0" style="
          width: 650px;
          margin: 0 auto;
          max-width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          background-color: #FAFAFA;
          text-align: center;
        ">
            <tr>
                <td>
                    <table border="0" cellpadding="0" cellspacing="0"
                        style="width: 100%; border-collapse: collapse; table-layout: fixed">
                        <tr>
                            <td style="padding: 25px;">
                                <ul style="list-style: none;background: #fff;border-radius: 24px;padding-left: 0;">
                                    <li style="width: 515px;margin: 0 auto;">
                                        <a href="javascript:void(0)"
                                            style="display: inline-block;padding: 30px 0 15px; max-width:300px">
                                            <img style="width: 100%;
                                              height: auto;
                                              object-fit: cover;" src="${logo}" alt="logo" /></a>
                                        <p
                                            style="font-size: 24px;line-height: 36px;font-weight: 700;padding: 0px 0 15px;color: #1D2939;">
                                            Connect With Us</p>
                                        <div style="width: 500px;margin: 0 auto;border-bottom: 1px solid #E4E9F8;"></div>
                                    </li>
                                    <li style="width: 515px;margin: 30px auto 0;padding-bottom: 30px;border-bottom: 1px solid #E4E9F8;">
                                        <ul style="text-align: left;list-style: none;"> 
                                            <li>
                                                <span style="display: inline-block;width: 35%;font-size: 16px;line-height: 30px;font-weight: 400;color: rgba(0, 0, 0,0.7);">Name:</span>
                                                <span style="font-size: 16px;line-height: 30px;font-weight: 400;color: #1C7678;">${full_name}</span>
                                            </li>
                                            <li>
                                                <span style="display: inline-block;width: 35%;font-size: 16px;line-height: 30px;font-weight: 400;color: rgba(0, 0, 0,0.7);">Mobile Number:</span>
                                                <span style="font-size: 16px;line-height: 30px;font-weight: 400;color: #1C7678;">${mobile_number}</span>
                                            </li>
                                            <li>
                                                <span style="display: inline-block;width: 35%;font-size: 16px;line-height: 30px;font-weight: 400;color: rgba(0, 0, 0,0.7);">User Role</span>
                                                <span style="font-size: 16px;line-height: 30px;font-weight: 400;color: #1C7678;">${user_role}</span>
                                            </li>
                                            <li>
                                                <span style="display: inline-block;width: 35%;font-size: 16px;line-height: 30px;font-weight: 400;color: rgba(0, 0, 0,0.7);">Range</span>
                                                <span style="font-size: 16px;line-height: 30px;font-weight: 400;color: #1C7678;">${company_strength}</span>
                                            </li>
                                            <li>
                                                <span style="display: inline-block;width: 35%;font-size: 16px;line-height: 30px;font-weight: 400;color: rgba(0, 0, 0,0.7);">Email:</span>
                                                <span style="font-size: 16px;line-height: 30px;font-weight: 400;color: #1C7678;">${email}</span>
                                            </li>
                                            <li>
                                                <span style="display: inline-block;width: 35%;font-size: 16px;line-height: 30px;font-weight: 400;color: rgba(0, 0, 0,0.7);">Question:</span>
                                                <span style="display: inline-block;width: 60%;vertical-align: top;font-size: 16px;line-height: 22px;font-weight: 400;color: #1C7678;">${question}</span>
                                            </li>
                                        </ul>
                                    </li>
                                    <li style="width: 515px;margin: 0 auto;">
                                        <h2
                                            style="list-style: none;margin-bottom: 5px; padding-bottom: 30px; font-size: 16px;font-weight: 500;line-height: 26px;color: rgba(0, 0, 0,0.7);">
                                            Please feel free to contact us on
                                            <a style="color: #1C7678;text-decoration: none;"
                                                href="">support@instaclaus.com</a>
                                        </h2>
                                    </li>
                                </ul>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <h4 style="font-size: 16px;font-weight: 500;line-height: 26px;color: #475467;margin: 0;">
                                    Thanks,</h4>
                                <p
                                    style="font-size: 20px;font-weight: 700;line-height: 26px;color: #1D2939;margin: 0 0 30px;">
                                    Team Instaclaus</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    
    </html>`;
