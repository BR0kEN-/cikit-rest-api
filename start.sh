#!/usr/bin/env bash

set -e
cd /usr/local/share/cikit/matrix/roles/api/files/cikit-rest-api

cikit env/start --ignore-cikit-mount --privileged
cikit ssh "apt install ssh lxc iptables linux-headers-\$(uname -r) -y"
cikit matrix/provision --rest-api

# https://www.linode.com/community/questions/17114/docker-wont-start-using-the-latest-linode-kernel#answer-67349
cikit ssh "mkdir -p /etc/systemd/system/containerd.service.d/"
cikit ssh "echo -e '[Service]\nExecStartPre=' > /etc/systemd/system/containerd.service.d/override.conf"
cikit ssh "systemctl daemon-reload"

if cikit ssh "bash -c 'service docker start && systemctl enable docker'"; then
  if [[ "$1" == "test" ]]; then
    cikit ssh "bash -c 'cd /var/www/cikit-rest-api && npm run lint && npm test'"
  fi
else
  cikit ssh "bash -c 'journalctl --no-pager -xe'"
fi
