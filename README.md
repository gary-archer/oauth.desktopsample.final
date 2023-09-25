# Final OAuth Desktop App

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/4c74baaeb2de4d4189800314630d7522)](https://app.codacy.com/gh/gary-archer/oauth.desktopsample.final?utm_source=github.com&utm_medium=referral&utm_content=gary-archer/oauth.desktopsample.final&utm_campaign=Badge_Grade)

[![Known Vulnerabilities](https://snyk.io/test/github/gary-archer/oauth.desktopsample.final/badge.svg)](https://snyk.io/test/github/gary-archer/oauth.desktopsample.final)

## Overview

* The final OpenID Connect desktop code sample, referenced in my blog at https://authguidance.com
* **The goal is to implement OpenID Connect desktop logins with best usability and reliability**

## Views

The desktop app is a simple UI with some basic navigation between views, to render fictional resources.\
The data is returned from an API that authorizes access to resources using claims from multiple sources.

![Desktop App Views](./doc/views.png)

## Local Development Quick Start

Build the app via this command, which will build the renderer side of the app in watch mode:

```bash
./build.sh
```

Next run the app, to trigger the OpenID Connect desktop flow:

```bash
./run.sh
```

A login is triggered in the system browser, so that the app cannot access the user's credentials.\
A private URI scheme callback URL of `x-mycompany-desktopapp:/callback` is used to receive the login response:

![Desktop App Login](./doc/login.png)

You can login to the desktop app using my AWS Cognito test account:

```text
- User: guestuser@mycompany.com
- Password: GuestPassword1
```

You can then test all lifecycle operations, including token refresh, expiry events and logout.

## Further Information

* See the [API Journey - Client Side](https://authguidance.com/api-journey-client-side/) for further information on the app's behaviour
* Further details specific to the desktop app are provided, starting in the [Final Desktop Sample Overview](https://authguidance.com/final-desktop-sample-overview/)

## Programming Languages

* Electron, TypeScript and React are used to implement the Cross Platform Desktop App

## Infrastructure

* The [AppAuth-JS Library](https://github.com/openid/AppAuth-JS/blob/master/README.md) is used to implement the Authorization Code Flow (PKCE)
* The [keytar](https://github.com/atom/node-keytar) library is used by the Desktop App for secure storage of OAuth tokens
* AWS API Gateway is used to host the Desktop App's OAuth Secured API
* AWS Cognito is used as the default Authorization Server for the UI and API
