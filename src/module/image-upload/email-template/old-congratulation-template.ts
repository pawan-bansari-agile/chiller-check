//   <!DOCTYPE html>
// <html lang="en">
//   <head>
//     <meta charset="UTF-8" />
//     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//     <title>Set Password</title>
//     <link rel="preconnect" href="https://fonts.googleapis.com" />
//     <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
//     <link
//       href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap"
//       rel="stylesheet"
//     />
//   </head>
//   <body style="padding: 0; margin: 0; font-family: Roboto">
//     <table
//       style="
//         background-color: #fff;
//         width: 650px;
//         margin: 0 auto;
//         max-width: 100%;
//         border-collapse: collapse;
//         table-layout: fixed;
//         padding: 47px 50px 28px;
//         display: block;
//       "
//     >
//       <thead>
//         <tr>
//           <td>
//             <table
//               style="
//                 width: 100%;
//                 border-collapse: collapse;
//                 table-layout: fixed;
//               "
//             >
//               <tr>
//                 <td
//                   style="
//                     vertical-align: middle;
//                     text-align: center;
//                     padding-bottom: 57px;
//                     width: 100%;
//                   "
//                 >
//                   <span
//                     style="
//                       border-bottom: 1px solid #00a86b;
//                       font-weight: 500;
//                       font-size: 20px;
//                       line-height: 24px;
//                       color: rgba(0, 0, 0, 0.85);
//                       padding-bottom: 10px;
//                     "
//                     >Account Created Successfully</span
//                   >
//                 </td>
//               </tr>
//             </table>
//           </td>
//         </tr>
//       </thead>
//       <tbody>
//         <tr>
//           <td>
//             <table
//               style="
//                 vertical-align: middle;
//                 width: 100%;
//                 color: #333333;
//                 font-weight: 400;
//                 font-size: 14px;
//                 line-height: 131%;
//                 padding-bottom: 120px;
//               "
//             >
//               <tr>
//                 <td style="padding-bottom: 20px;">Hi ${full_name},</td>
//               </tr>
//               <tr>
//                 <td style="padding-bottom: 20px;">Wecome to chiller check.</td>
//               </tr>
//               <tr>
//                 <td style="padding-bottom: 20px;">We are very excited to have you onboard.</td>
//               </tr>
//               <tr>
//                 <td style="padding-bottom: 20px;">You have been invited to this system as a ${role}.</td>
//               </tr>
//               <tr>
//                 <td style="padding-bottom: 20px;">Setup Your Password by clicking on the below button.</td>
//               </tr>
//               <tr>
//                 <td style="padding-bottom: 30px;">
//                   Once your password is setup you can login into the system
//                   using your registered email <b>${email}.</b>
//                 </td>
//               </tr>
//               <tr>
//                 <td style="text-align: center;padding-bottom: 35px;">
//                 <a href="${redirect_url}">
//                   <button
//                     style="
//                       background: #000abc;
//                       font-size: 14px;
//                       font-weight: 700;
//                       color: #fff;
//                       border-radius: 30px;
//                       padding: 6.5px 35px;
//                       border: none;
//                       cursor: pointer;
//                     "
//                   >
//                     Set Password
//                   </button>
//                   <a>
//                 </td>
//               </tr>
//               <tr>
//                 <td style="padding-bottom: 20px;">
//                   <span
//                     >Please note that the option to set your password will
//                     expire within 24 hours.</span
//                   >
//                 </td>
//               </tr>
//               <tr>
//                 <td style="padding-bottom: 20px;">
//                   <span
//                     >If the password link has expired, you can reach out to your
//                     superior to generate a new password link & share it. Else
//                     email to us at support@chillercheck.com</span
//                   >
//                 </td>
//               </tr>
//               <tr>
//                 <td>Thanks.</td>
//               </tr>
//             </table>
//           </td>
//         </tr>
//       </tbody>
//       <tfoot>
//         <tr>
//           <td>
//             <table
//               style="
//                 width: 100%;
//                 border-collapse: collapse;
//                 table-layout: fixed;
//               "
//             >
//               <tr>
//                 <td
//                   style="
//                     vertical-align: middle;
//                     text-align: center;
//                     padding-top: 30px;
//                     width: 100%;
//                   "
//                 >
//                   <a href="javascript:void(0)"
//                     ><img
//                       src="${process.env.LOGO_URL}"
//                       alt="logo"
//                       style="max-width: 180px"
//                   /></a>
//                 </td>
//               </tr>
//               <tr>
//                 <td
//                   style="
//                     vertical-align: middle;
//                     text-align: center;
//                     padding-top: 30px;
//                     width: 100%;
//                   "
//                 >
//                   <span
//                     style="
//                       font-size: 16px;
//                       font-weight: 400;
//                       line-height: 24px;
//                       color: rgba(0, 0, 0, 0.85);
//                     // "
//                     >For any assistance reach out at
//                     support@chillercheck.com</span
//                   >
//                 </td>
//               </tr>
//             </table>
//           </td>
//         </tr>
//       </tfoot>
//     </table>
//   </body>
// </html>
