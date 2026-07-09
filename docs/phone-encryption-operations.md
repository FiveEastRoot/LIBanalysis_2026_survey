# Phone Encryption Operations

이 문서는 휴대폰 번호를 원문으로 시트에 저장하지 않고, 중복 응답 방지와 사후 복호화를 함께 처리하는 운영 절차를 정리합니다.

## Storage Model

| Field | Purpose | Reversible |
| --- | --- | --- |
| `phoneHash` | 중복 제출 확인용 HMAC-SHA256 값 | No |
| `phoneEncrypted` | 사후 운영 확인/답례 발송 등을 위한 AES-256-GCM 암호문 | Yes, with local key |
| `phoneEncryptionVersion` | 암호화 방식 버전 | No |

원문 전화번호는 Netlify Function에서만 일시적으로 사용하고, Apps Script Webhook이나 Google Sheets로 전달하지 않습니다.

## Required Secrets

Netlify 환경변수:

- `PHONE_ENCRYPTION_KEY`: 32바이트 랜덤 키를 base64로 인코딩한 값
- `PHONE_HASH_SECRET`: HMAC-SHA256용 긴 랜덤 문자열

기존 환경변수:

- `SHEETS_WEBHOOK_URL`
- `SHEETS_WEBHOOK_SECRET`

`PHONE_ENCRYPTION_KEY`는 나중에 로컬 복호화에도 필요하므로 운영 책임자가 안전한 위치에 별도 보관해야 합니다. GitHub에는 저장하지 않습니다.

## Generate Local Secrets

PowerShell:

```powershell
node -e "const crypto=require('crypto'); console.log('PHONE_ENCRYPTION_KEY='+crypto.randomBytes(32).toString('base64')); console.log('PHONE_HASH_SECRET='+crypto.randomBytes(48).toString('base64url'))"
```

생성된 값은 Netlify 환경변수에 저장하고, 복호화 담당자만 접근 가능한 로컬 보안 보관소에 별도 저장합니다.

현재 로컬 작업환경에는 복호화용 값이 `local-secrets/phone-encryption.env`에 생성되어 있습니다. 이 파일은 `.gitignore`에 포함되어 GitHub에 올라가지 않습니다.

## Set Netlify Environment Variables

Netlify UI에서 아래 위치로 이동합니다.

```text
Netlify project
  -> Site configuration
  -> Environment variables
```

다음 값을 추가합니다.

- `PHONE_ENCRYPTION_KEY`
- `PHONE_HASH_SECRET`

값은 `local-secrets/phone-encryption.env`에서 확인합니다. 값 자체는 보안정보이므로 문서나 이슈, 채팅에 붙여넣지 않습니다.

## Google Sheets Columns

`PII` 탭은 다음 컬럼을 사용합니다.

- `requestId`
- `receivedAt`
- `submittedAt`
- `P1-EXCLUDE`
- `phoneHash`
- `phoneEncrypted`
- `phoneEncryptionVersion`

기존 테스트 과정에서 생성된 `P2-EXCLUDE` 평문 전화번호 컬럼과 테스트 행은 운영 전 삭제합니다.

## Local Decryption

1. Google Sheets의 `PII` 탭을 CSV로 다운로드합니다.
2. 복호화 키를 환경변수로 설정합니다.
3. 로컬 스크립트를 실행합니다.

PowerShell:

```powershell
$env:PHONE_ENCRYPTION_KEY=(Get-Content .\local-secrets\phone-encryption.env | Where-Object { $_ -like "PHONE_ENCRYPTION_KEY=*" }).Split("=", 2)[1]
node scripts/decrypt-phone-csv.mjs --input .\pii.csv --output .\pii-decrypted.csv
```

결과 파일에는 기존 컬럼 뒤에 `phoneDecrypted` 컬럼이 추가됩니다.

## Rotation Notes

- `PHONE_HASH_SECRET`을 바꾸면 기존 `phoneHash`와 신규 `phoneHash`가 달라져 중복 검사가 이어지지 않습니다.
- `PHONE_ENCRYPTION_KEY`를 바꾸면 기존 `phoneEncrypted`는 이전 키로만 복호화할 수 있습니다.
- 운영 중 키를 교체하려면 `phoneEncryptionVersion`을 올리고, 버전별 키 보관 정책을 먼저 정해야 합니다.
