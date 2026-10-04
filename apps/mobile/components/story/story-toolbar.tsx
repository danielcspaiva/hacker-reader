import { Stack } from "expo-router";

import { toolbarIcon } from "@/components/navigation/toolbar-icon";
import { useExternalLink } from "@/hooks/use-external-link";
import type { StoryActions } from "@/hooks/use-story-actions";
import { useTheme } from "@/hooks/use-theme";
import type { StoryWithComments } from "@/lib/hn";

/**
 * Bookmark button and the "more" menu in the native header. A toolbar menu
 * opens on tap, unlike the long-press-only @expo/ui ContextMenu.
 */
export function StoryToolbar({
  story,
  actions,
  hasThreads,
  onCollapseAll,
  onExpandAll,
}: {
  story: StoryWithComments;
  actions: StoryActions;
  /** Whether any top-level comment has replies to collapse. */
  hasThreads: boolean;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}) {
  const { colors } = useTheme();
  const openLink = useExternalLink();
  const { isBookmarked } = actions;
  const url = story.url;

  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon={toolbarIcon(isBookmarked ? "bookmarkFilled" : "bookmark")}
        iconRenderingMode="template"
        tintColor={isBookmarked ? colors.primary : undefined}
        accessibilityLabel={isBookmarked ? "Remove bookmark" : "Bookmark"}
        onPress={actions.handleBookmark}
      />
      <Stack.Toolbar.Menu
        icon={toolbarIcon("more")}
        iconRenderingMode="template"
        accessibilityLabel="More actions"
      >
        <Stack.Toolbar.MenuAction
          icon={toolbarIcon("share")}
          onPress={actions.handleShare}
        >
          Share
        </Stack.Toolbar.MenuAction>
        {url ? (
          <Stack.Toolbar.MenuAction
            icon={toolbarIcon("safari")}
            onPress={() => void openLink(url)}
          >
            Open in Browser
          </Stack.Toolbar.MenuAction>
        ) : null}
        {hasThreads ? (
          <Stack.Toolbar.Menu inline title="">
            <Stack.Toolbar.MenuAction
              icon={toolbarIcon("collapseAll")}
              onPress={onCollapseAll}
            >
              Collapse All
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon={toolbarIcon("expandAll")}
              onPress={onExpandAll}
            >
              Expand All
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        ) : null}
        <Stack.Toolbar.Menu inline title="">
          <Stack.Toolbar.MenuAction
            icon={toolbarIcon("hide")}
            onPress={actions.handleHide}
          >
            Hide
          </Stack.Toolbar.MenuAction>
          {actions.muteDomain ? (
            <Stack.Toolbar.MenuAction
              icon={toolbarIcon("mute")}
              onPress={actions.handleMuteDomain}
            >
              {`Mute ${actions.muteDomain}`}
            </Stack.Toolbar.MenuAction>
          ) : null}
          <Stack.Toolbar.MenuAction
            icon={toolbarIcon("flag")}
            destructive
            onPress={actions.handleFlag}
          >
            Flag
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon={toolbarIcon("block")}
            destructive
            onPress={actions.handleBlockUser}
          >
            Block User
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}
