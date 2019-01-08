#!/usr/bin/env bash

set -e
cd /usr/local/share/cikit/matrix/roles/api/files/cikit-rest-api

cikit env/start --ignore-cikit-mount --privileged
cikit ssh "apt install ssh lxc iptables -y"
cikit matrix/provision --rest-api

if cikit ssh "bash -c 'service docker start && systemctl enable docker'"; then
  if [[ "$1" == "test" ]]; then
    cikit ssh "bash -c 'cd /var/www/cikit-rest-api && npm run lint && npm test'"
  fi
else
  cikit ssh "bash -c 'journalctl --no-pager -xe'"
fi
