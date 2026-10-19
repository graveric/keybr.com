import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import { render } from "@testing-library/react";
import { isNotNull, isNull } from "rich-assert";
import { type SignInActions } from "./actions.ts";
import { SignInSection } from "./SignInSection.tsx";

test("render", () => {
  const r = render(
    <FakeIntlProvider>
      <SignInSection actions={{} as SignInActions} />
    </FakeIntlProvider>,
  );

  isNotNull(
    r.queryByText("Simple sign-in that does not use passwords.", {
      exact: false,
    }),
  );
  isNotNull(
    r.queryByText("Sign-in with your preferred social network.", {
      exact: false,
    }),
  );
  isNotNull(r.queryByText("Google", { exact: false }));
  isNotNull(r.queryByText("Microsoft", { exact: false }));
  isNotNull(r.queryByText("Facebook", { exact: false }));
  isNull(r.queryByText("Premium account", { exact: false }));
  isNull(r.queryByText("Buy a premium account", { exact: false }));

  r.unmount();
});
