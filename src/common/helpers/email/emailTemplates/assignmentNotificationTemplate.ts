import { Role } from "src/common/constants/enum.constant";

export const assignmentNotificationTemplate = (
  fullName: string,
  role: Role.CORPORATE_MANAGER | Role.FACILITY_MANAGER | Role.OPERATOR,
  entityName: string | string[],
): string => {
  const greeting = `Hi ${fullName},`;
  let body = "";
  let title = "";

  const entityList =
    Array.isArray(entityName) && entityName.length > 1
      ? `<ul style="padding-left: 20px; margin: 10px 0;">${entityName
          .map((name) => `<li>${name}</li>`)
          .join("")}</ul>`
      : `<strong>${Array.isArray(entityName) ? entityName[0] : entityName}</strong>`;

  switch (role) {
    case Role.CORPORATE_MANAGER:
      title = "Company Assigned";
      body = `You have been assigned a new Company - ${entityList}.<br/><br/>
              You can now manage the data under this company & its users.`;
      break;

    case Role.FACILITY_MANAGER:
      title = "Facility Assigned";
      body = `You have been assigned ${Array.isArray(entityName) && entityName.length > 1 ? "multiple Facilities" : "a new Facility"} - ${entityList}.<br/><br/>
              You can now manage the data under this facility & its users.`;
      break;

    case Role.OPERATOR:
      title = "Chiller Assigned";
      body = `You have been assigned ${Array.isArray(entityName) && entityName.length > 1 ? "multiple Chillers" : "a new Chiller"} - ${entityList}<br/><br/>
              You can now manage the data under this chiller.`;
      break;

    default:
      body = `You have been assigned a new entity - ${entityList}.<br/><br/>
              Please check your dashboard for more details.`;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <title>Chiller Assignment</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
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
    <body>
        

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
                    padding-top: 30px;
                    width: 100%;
                  "
                >
                  <a href="javascript:void(0)"
                    ><img
                      src="${process.env.LOGO_URL}"
                      alt="logo"
                      style="max-width: 180px; margin-bottom: 40px"
                  /></a>
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
                <td style="text-align: center;display: inline-block;width: 100%;font-weight: 700;font-size: 20px;color: #101112;line-height: 25px;padding-bottom: 55px;">
                  <span style="border-bottom: 1px solid #00a86b;padding-bottom: 10px;">${title}</span>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 20px;">${greeting}</td>
              </tr>
              <tr>
                <td style="padding-bottom: 20px;">${body}</td>
              </tr>
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
      </tbody>
    </table>
    </body>
    </html>
  `;
};
