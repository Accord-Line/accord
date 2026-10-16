# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace.spec.ts >> component properties enter the real draft; unsupported data cannot replace it; keyboard dialog returns focus
- Location: tests\e2e\workspace.spec.ts:136:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByTestId('save-status')
Expected: "已保存到本机"
Received: "待保存"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" getByTestId('save-status') with timeout 5000ms
  - waiting for getByTestId('save-status')
    - locator resolved to <span role="status" data-testid="save-status">待保存</span>
    - unexpected value "待保存"

```

```yaml
- status: 待保存
```

```
Tearing down "context" exceeded the test timeout of 60000ms.
```