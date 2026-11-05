// Conventional Commits를 따르고, 설명은 한글로 시작해야 한다.
const config = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'subject-starts-with-hangul': ({ subject }) => [
          /^[가-힣]/.test(subject ?? ''),
          '설명은 한글로 시작해야 합니다',
        ],
      },
    },
  ],
  rules: { 'subject-starts-with-hangul': [2, 'always'] },
}

export default config
