export const failedLoginAttemptsTemplate = (
  userFullName: string,
  userRole: string,
  adminFullname?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  subAdminFullname?: string,
): string => {
  const recipientName = adminFullname || subAdminFullname || "Team";

  return `<!DOCTYPE html>
<html lang="en">

<head>
    <title>Chiller Check</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <style type="text/css">
        /* Font definitions omitted for brevity — keep as-is from your template */
        @font-face {
            font-family: 'SF Pro Display';
            src: url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-BlackItalic.eot');
            src: url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-BlackItalic.eot?#iefix') format('embedded-opentype'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-BlackItalic.woff2') format('woff2'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-BlackItalic.woff') format('woff'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-BlackItalic.ttf') format('truetype'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-BlackItalic.svg#SFProDisplay-BlackItalic') format('svg');
            font-weight: 900;
            font-style: italic;
            font-display: swap;
        }

        @font-face {
            font-family: 'SF Pro Display';
            src: url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Medium.eot');
            src: url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Medium.eot?#iefix') format('embedded-opentype'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Medium.woff2') format('woff2'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Medium.woff') format('woff'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Medium.ttf') format('truetype'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Medium.svg#SFProDisplay-Medium') format('svg');
            font-weight: 500;
            font-style: normal;
            font-display: swap;
        }

        @font-face {
            font-family: 'SF Pro Display';
            src: url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Bold.eot');
            src: url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Bold.eot?#iefix') format('embedded-opentype'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Bold.woff2') format('woff2'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Bold.woff') format('woff'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Bold.ttf') format('truetype'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Bold.svg#SFProDisplay-Bold') format('svg');
            font-weight: bold;
            font-style: normal;
            font-display: swap;
        }

        @font-face {
            font-family: 'SF Pro Display';
            src: url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-HeavyItalic.eot');
            src: url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-HeavyItalic.eot?#iefix') format('embedded-opentype'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-HeavyItalic.woff2') format('woff2'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-HeavyItalic.woff') format('woff'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-HeavyItalic.ttf') format('truetype'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-HeavyItalic.svg#SFProDisplay-HeavyItalic') format('svg');
            font-weight: 900;
            font-style: italic;
            font-display: swap;
        }

        @font-face {
            font-family: 'SF Pro Display';
            src: url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Regular.eot');
            src: url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Regular.eot?#iefix') format('embedded-opentype'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Regular.woff2') format('woff2'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Regular.woff') format('woff'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Regular.ttf') format('truetype'),
                url('https://storage.googleapis.com/goat-grub/email/fonts/SFProDisplay-Regular.svg#SFProDisplay-Regular') format('svg');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
        }
    </style>
</head>

<body style="font-family: 'SF Pro Display';font-weight: 400;background-color: #EDEFF2;margin:0;">
    <div style="max-width:800px;margin: 0 auto;background-color: #ffffff;">
        <table style="border: 0;border-spacing: 0;width: 100%;">
            <tr>
                <td style="text-align: center;max-height: 75px;">
                    <a href="javascript:void(0)" target="_blank" style="display: inline-block;padding: 22px 0px;">
                        <img src="${process.env.LOGO_URL}" alt="logo"
                            style="width:100%;height:45px">
                    </a>
                </td>
            </tr>
            <tr>
                <td style="padding:30px 50px 40px;">
                    <table style="border: 0;border-spacing:0;">
                        <tr>
                            <td style="text-align: center;display: inline-block;width: 100%;font-weight: 700;font-size: 20px;color: #101112;line-height: 25px;padding-bottom: 55px;">
                                <span style="border-bottom: 1px solid #00a86b;padding-bottom: 10px;">3 Failed Attempts - User Inactivated</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="font-weight: 400;font-size: 16px;color: #101112;line-height: 25px;text-align: left;padding-bottom: 25px;">
                                Hi ${recipientName},
                            </td>
                        </tr>
                        <tr>
                            <td style="font-weight: 400;font-size: 16px;color: #101112;line-height: 25px;text-align: left;">
                                The ${userRole} - ${userFullName} has been inactivated due to 3 failed login attempts within 1 hour.
                            </td>
                        </tr>
                        <tr>
                          <td style="font-weight: 400;font-size: 16px;color: #101112;line-height: 25px;padding-top:15px;text-align: left;">
                    You can contact them outside the system & activate them back from the user management module.
                </td>
                </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding:0px 50px 60px;">
                    <table style="border: 0;border-spacing:0;">
                        <tr>
                            <td style="font-weight: 400;font-size: 17px;color: #404040;line-height: 23px;">
                                Thanks.
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
</body>

</html>`;
};
