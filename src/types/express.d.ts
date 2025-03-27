import 'express'; // Import express to extend its types

declare module 'express' {
  interface Request {
    samlLogoutRequest?: any; // Add the `samlLogoutRequest` property
    user?: any; // Ensure `user` is defined
  }
}