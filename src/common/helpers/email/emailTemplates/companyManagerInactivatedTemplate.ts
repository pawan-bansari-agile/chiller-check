export const companyManagerInactivatedTemplate = (
  managerFirstName: string,
): string => `<!DOCTYPE html>
<html lang="en">

<head>
    <title>Chiller check</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <style type="text/css">
        /* Font-face declarations – same as your original email, reuse them without changes */
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

<body style="font-family: 'SF Pro Display'; font-weight: 400; background-color: #EDEFF2; margin: 0;">
    <div style="max-width:800px; margin: 0 auto; background-color: #ffffff;">
        <table style="border: 0; border-spacing: 0; width: 100%;">
            <tr>
                <td style="text-align: center; max-height: 75px;">
                    <a href="javascript:void(0)" target="_blank" style="display: inline-block; padding: 22px 0px;">
                        <img src="${process.env.LOGO_URL}" alt="logo"
                            style="width: 100%; height: 45px;">
                    </a>
                </td>
            </tr>
            <tr>
                <td style="padding:30px 50px 40px;">
                    <table style="border: 0; border-spacing: 0;">
                        <tr>
                            <td style="justify-content: center; display: flex; font-weight: 700; font-size: 20px; color: #101112; line-height: 25px;">
                                Free Trial Ending Notification
                            </td>
                        </tr>
                        <tr><td><hr></td></tr>
                        <tr>
                            <td style="font-weight: 700; font-size: 16px; color: #101112; line-height: 25px; text-align: center;">
                                Hi ${managerFirstName},
                            </td>
                        </tr>
                        <tr><td><br/></td></tr>
                        <tr>
                            <td style="font-weight: 400; font-size: 16px; color: #101112; line-height: 25px; text-align: center;">
                                Your company’s 30-day free trial has ended, and access to the system has been temporarily disabled.
                            </td>
                        </tr>
                        <tr><td><br/></td></tr>
                        <tr>
                            <td style="font-weight: 400; font-size: 16px; color: #101112; line-height: 25px; text-align: center;">
                                To reactivate your account and continue using our services, please contact our system administrator - support@chillercheck.com. A representative will reach out to you shortly to assist with payment setup.
                            </td>
                        </tr>
                        <tr><td><br/></td></tr>
                        <tr>
                            <td style="font-weight: 500; font-size: 16px; color: #101112; line-height: 25px; text-align: center;">
                               Thank you for trying our platform!
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding:45px 50px 60px;">
                    <table style="border: 0; border-spacing: 0;">
                        <tr>
                            <td style="font-weight: 600; font-size: 17px; color: #404040; line-height: 23px;">
                                Thanks, <span style="display: block;">The Chiller check Team</span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding:0;">
                    <table style="border: 0; border-spacing: 0; width: 100%; text-align: center;">
                        <tr>
                            <td style="padding:10px; background-color: #13132A; font-weight: 400; font-size: 13px; letter-spacing: 0.5px; color: #FFFFFF;">
                                Copyright ©2025 Chiller check | All Rights Reserved
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
</body>

</html>`;
