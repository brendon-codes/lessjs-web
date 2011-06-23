# Web Conversion for For Less.js

This is meant to be a development utility only. Do not use this
in production, as it is probably prone to security problems.

## Example

```shell
## Assuming file "/var/www/css/foo.less" exists
node ./lessweb.js /var/www/ --listen 127.0.0.1 --port 61775
wget http://127.0.0.1:61775/css/foo.less
```
