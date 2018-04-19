#!/usr/bin/env bash -e

cd /usr/local/share/cikit/matrix/roles/api/files/cikit-rest-api

cikit env/start --ignore-cikit-mount --privileged
cikit ssh "apt install ssh lxc iptables -y"
cikit matrix/provision --rest-api
cikit ssh "bash -c 'service docker start && systemctl enable docker'"

if [ "test" == "$1" ]; then
  cikit ssh "bash -c 'cd /var/www/cikit-rest-api && npm run lint && npm test'"
fi
