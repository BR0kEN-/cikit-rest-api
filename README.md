# CIKit Matrix REST API

[![Build status](https://img.shields.io/travis/BR0kEN-/cikit-rest-api.svg?style=flat-square)](https://travis-ci.org/BR0kEN-/cikit-rest-api)
[![Coverage status](https://img.shields.io/coveralls/github/BR0kEN-/cikit-rest-api/master.svg?style=flat-square)](https://coveralls.io/github/BR0kEN-/cikit-rest-api)

## Requirements

- CIKit
- Docker

## Installation

Do not try to install the package separately! It's a submodule of [CIKit](https://github.com/BR0kEN-/cikit).

```bash
./start.sh
cikit ssh
cd /var/www/cikit-rest-api
npm start
```

## Linting

```bash
npm run lint
```

## Testing

```bash
npm test
```

## User groups

- `viewer`

  Can see the list of droplets.

- `manager`

  Can manage (add/delete/start/stop/restart) droplets.

- `owner`

  Single per system. Can do everything.

*Every role inherits permissions from previous.*

## CLI

### User

Get help.

```bash
node ./lib/cli/commands/create-user.js -h
```

Create an owner of the API (kinda super user that can be only one per system):

```bash
node ./lib/cli/commands/create-user.js -u BR0kEN -g owner
```

*Note, that further attempts to create an owner will be declined.*

Forcibly invalidate user's authentication token and regenerate a secret key.

```bash
node ./lib/cli/commands/create-user.js -u BR0kEN -g owner -r
```

## API

### Available endpoints

#### User

- `POST` - `/api/v1/user/auth` - available for existing users of a system.

  Request an access token:

  ```bash
  curl http://localhost:1337/api/v1/user/auth -X POST -H "Content-Type: application/json" -d '{"username": "BR0kEN", "code": "172459"}'
  ```

  Response sample:

  ```json
  {
    "token_type": "Bearer",
    "expires_in": 7200,
    "access_token": "5e11d712066b99a9868888ec253c1979da9dc8f9823831262139f235ab9d64c3",
    "refresh_token": "3ead5fbb1a4e3953f855d84b304d96b08d10a83cad38ebc544832f2125293f2b"
  }
  ```

  Add `Authorization: Bearer: ACCESS_TOKEN` header or `{"access_token": "ACCESS_TOKEN"}` to body for every request to an API. If you'll get `401`, then the token is expired and you have to send a request for its refreshment (better flow is to store the `expires_in` in your implementation and check its validity before sending a request to an API).

- `POST` - `/api/v1/user/auth/refresh` - can be accessed by existing user with valid refresh token.

  Refresh an existing access token using the `refresh_token` given after successful authentication:

  ```bash
  curl http://localhost:1337/api/v1/user/auth/refresh -X POST -H "Content-Type: application/json" -d '{"grant_type": "refresh_token", "refresh_token": "REFRESH_TOKEN"}'
  ```

  *The structure of a response is the same as for previous API query.*

- `DELETE` - `/api/v1/user/auth/revoke/:user` - authorized owner can revoke for anyone, authorized users can revoke for ourselves.

  Revoke `access` and `refresh` tokens for a given user (require re-authentication).

  ```bash
  curl http://localhost:1337/api/v1/user/auth/revoke/BR0kEN -X DELETE -H "Content-Type: application/json" -H "Authorization: Bearer REFRESH_TOKEN"
  ```

  Response sample:

  ```json
  {
    "status": "ok"
  }
  ```

- `GET` - `/api/v1/user/auth/setup/:user` - authorized owner can request a QR code for setting up an authenticating application.

  ```bash
  curl http://localhost:1337/api/v1/user/auth/setup/BR0kEN -X GET -H "Content-Type: application/json" -H "Authorization: Bearer ACCESS_TOKEN"
  ```

  Response sample:

  ```json
  {
    "qr": "BASE64_ENCODED_PNG",
    "secret": "SECRET_KEY"
  }
  ```

- `GET` - `/api/v1/user/list`
- `POST` - `/api/v1/user/add`
- `DELETE` - `/api/v1/user/delete/:user`

The `/api/v1/user/add` and `/api/v1/user/delete` returns an updated list of users.

#### Droplet

- `GET` - `/api/v1/droplet/list`
- `POST` - `/api/v1/droplet/add`
- `PATCH` - `/api/v1/droplet/stop/:droplet`
- `PATCH` - `/api/v1/droplet/start/:droplet`
- `PATCH` - `/api/v1/droplet/restart/:droplet`
- `DELETE` - `/api/v1/droplet/delete/:droplet`

All `/api/v1/droplet/*` endpoints returns a list of droplets. After `add`, `stop`, `start`, `restart` and `delete` an updated list will be returned.
