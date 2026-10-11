import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import { type PageData, PageDataContext } from "@keybr/pages-shared";
import { render } from "@testing-library/react";
import { isNotNull, isNull } from "rich-assert";
import { SpacesSection } from "./SpacesSection.tsx";

function pageData(
  spaces: readonly { id: number; name: string; isDefault: boolean }[],
  activeSpaceId: number | null,
): PageData {
  return {
    publicUser: { id: "abc", name: "name", imageUrl: null, premium: false },
    spaces,
    activeSpaceId,
  } as unknown as PageData;
}

test("renders nothing for an anonymous user", () => {
  const r = render(
    <FakeIntlProvider>
      <PageDataContext.Provider value={pageData([], null)}>
        <SpacesSection />
      </PageDataContext.Provider>
    </FakeIntlProvider>,
  );

  isNull(r.queryByText("Profile space:"));
});

test("renders space controls", () => {
  const r = render(
    <FakeIntlProvider>
      <PageDataContext.Provider
        value={pageData(
          [
            { id: 1, name: "Default", isDefault: true },
            { id: 2, name: "Work", isDefault: false },
          ],
          1,
        )}
      >
        <SpacesSection />
      </PageDataContext.Provider>
    </FakeIntlProvider>,
  );

  isNotNull(r.queryByText("Profile space:"));
  isNotNull(r.queryByText("New"));
  isNotNull(r.queryByText("Rename"));
  isNotNull(r.queryByText("Delete"));
  isNotNull(r.queryByText("Make default"));
});
