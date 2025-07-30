export const resetPasswordTemplate = (
  redirect_url: string,
  full_name: string,
  dataURI: string,
) =>
  `
  <!DOCTYPE html>
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
                                          object-fit: cover;" src="${dataURI}" alt="logo" /></a>
                                    <p
                                        style="font-size: 24px;line-height: 36px;font-weight: 700;padding: 0px 0 15px;color: #1D2939;">
                                        Reset Your Password</p>
                                    <div style="width: 500px;margin: 0 auto;border-bottom: 1px solid #E4E9F8;"></div>
                                </li>
                                <li style="width: 515px;margin: 0 auto;">
                                    <h1 style="margin: 10px 0;font-size: 25px;color: #1D2939;">Hi, ${full_name}
                                        </h1>
                                    <p
                                        style="font-size: 16px;line-height: 24px;font-weight: 500;color: rgba(0, 0, 0,0.7);">
                                        You can now set your password by clicking the button below.</p>
                                        <a href="${redirect_url}">
                                        <button
                                        style="margin: 10px 0 30px;background: #1B686A;box-shadow: none;border: none;color: #fff;font-size: 16px;line-height: 24px;font-weight: 400;border-radius: 10px;padding: 13px 30px;cursor: pointer;">Set
                                        New Password</button></a>
                                        <p
                                            style="font-size: 16px;line-height: 24px;font-weight: 500;color: rgba(0, 0, 0,0.7);">
                                            After you have set your password, you would be able to login & use the system.</p>
                                        <p
                                            style="font-size: 16px;line-height: 24px;font-weight: 500;color: rgba(0, 0, 0,0.7);">
                                            Please note that the option to set your password will expire within 24 hours.</p>
                                    <div style="width: 500px;margin: 0 auto;border-bottom: 1px solid #E4E9F8;"></div>
                                </li>
                                <li style="width: 515px;margin: 0 auto;">
                                    <h2
                                        style="list-style: none;margin-bottom: 5px; padding-bottom: 30px; font-size: 16px;font-weight: 500;line-height: 26px;color: rgba(0, 0, 0,0.7);">
                                        If the password link has expired, you can reach out to your superior to generate a new password link & share it. Else email to us at <a style="color: #1C7678;text-decoration: none;"
                                            href="">support@chillercheck.com</a>
                                    </h2>
                                </li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <h4 style="font-size: 16px;font-weight: 500;line-height: 26px;color: #475467;margin: 0;">
                                Thanks,</h4>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>
  `;
