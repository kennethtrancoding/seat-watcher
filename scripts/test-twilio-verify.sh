#!/usr/bin/env bash
# When the app says it couldn't text a number: asks Twilio Verify for a code
# straight away and prints Twilio's own answer, which the app words more kindly
# (see docs/onboarding.md › Real text messages). Sends a real code if it works.
#
#   bash scripts/test-twilio-verify.sh +15551234567
#
# Asks for the Twilio Account SID and Auth Token, or reads TWILIO_ACCOUNT_SID
# and TWILIO_AUTH_TOKEN, like setup-twilio-verify.sh.
set -euo pipefail

SERVICE_NAME='Seat Watcher'
to=${1:-}
if [[ ! "$to" =~ ^\+[0-9]{8,15}$ ]]; then
  echo "Give the number with its country code, like: bash $0 +15551234567" >&2
  exit 1
fi

account_sid=${TWILIO_ACCOUNT_SID:-}
auth_token=${TWILIO_AUTH_TOKEN:-}
[[ -n "$account_sid" ]] || read -rp 'Twilio Account SID (starts with AC): ' account_sid
[[ -n "$auth_token" ]] || { read -rsp 'Twilio Auth Token: ' auth_token && echo; }

# Prints Twilio's answer whether or not it's an error.
twilio() { curl -sS -K <(printf 'user = "%s:%s"\n' "$account_sid" "$auth_token") "$@"; }

echo 'Account:'
twilio "https://api.twilio.com/2010-04-01/Accounts/$account_sid.json" | jq '{type, status, code, message}'

service_sid=$(twilio 'https://verify.twilio.com/v2/Services' |
  jq -r --arg name "$SERVICE_NAME" 'first(.services[]? | select(.friendly_name == $name) | .sid) // empty')
if [[ -z "$service_sid" ]]; then
  echo "No \"$SERVICE_NAME\" Verify service: run scripts/setup-twilio-verify.sh first." >&2
  exit 1
fi

echo "Asking Verify service $service_sid to text $to:"
twilio -X POST "https://verify.twilio.com/v2/Services/$service_sid/Verifications" \
  --data-urlencode "To=$to" --data-urlencode 'Channel=sms' | jq '{status, code, message, more_info}'
