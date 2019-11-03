# authguidance.desktopsample.final

### Overview

* A desktop sample using OAuth 2.0 and Open Id Connect, referenced in my blog at https://authguidance.com
* **The goal of this sample is improved deployment and usability for desktop logins, via a Private URI Scheme**

### Details

* See the [Final Sample Overview](https://authguidance.com/2018/01/26/final-desktop-sample-overview/) for details of how a Private URI Scheme is used

### Technologies

* Electron with TypeScript is used for the Desktop App, which can be run on Windows, Mac OS or Linux

### Middleware Used

* The [AppAuth-JS Library](https://github.com/openid/AppAuth-JS/blob/master/README.md) is used to implement the Authorization Code Flow (PKCE)
* The [keytar](https://github.com/atom/node-keytar) library is used by the Desktop App for secure storage of OAuth tokens
* Okta is used for the Authorization Server