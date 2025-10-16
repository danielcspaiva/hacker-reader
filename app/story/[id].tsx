import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getItem, HNItem } from '@/lib/hn-api';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Comment({ commentId }: { commentId: number }) {
  const [comment, setComment] = useState<HNItem | null>(null);
  const [showReplies, setShowReplies] = useState(true);
  const borderColor = useThemeColor({}, 'border');
  const tintColor = useThemeColor({}, 'tint');

  useEffect(() => {
    getItem(commentId).then(setComment);
  }, [commentId]);

  if (!comment || comment.deleted || comment.dead) {
    return null;
  }

  const timeAgo = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Parse HTML and create clickable links
  const parseHTMLWithLinks = (html?: string) => {
    if (!html) return null;

    const decodeEntities = (text: string) =>
      text
        .replace(/&#x2F;/g, '/')
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&');

    // Replace paragraph tags with newlines
    let processed = html
      .replace(/<p>/g, '\n\n')
      .replace(/<\/p>/g, '')
      .replace(/<i>/g, '')
      .replace(/<\/i>/g, '');

    // Match <a href="url">text</a> patterns
    const linkRegex = /<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/g;
    const parts: Array<{ type: 'text' | 'link'; content: string; url?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(processed)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        const textBefore = decodeEntities(processed.substring(lastIndex, match.index));
        if (textBefore) {
          parts.push({ type: 'text', content: textBefore });
        }
      }

      // Add the link
      parts.push({
        type: 'link',
        content: decodeEntities(match[2]),
        url: decodeEntities(match[1]),
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < processed.length) {
      const textAfter = decodeEntities(processed.substring(lastIndex));
      if (textAfter) {
        parts.push({ type: 'text', content: textAfter });
      }
    }

    return parts;
  };

  return (
    <View style={[styles.comment, { borderLeftColor: borderColor }]}>
      <View style={styles.commentHeader}>
        <ThemedText style={styles.commentAuthor}>{comment.by}</ThemedText>
        <ThemedText style={styles.commentTime}> • {timeAgo(comment.time || 0)}</ThemedText>
        {comment.kids && comment.kids.length > 0 && (
          <TouchableOpacity onPress={() => setShowReplies(!showReplies)}>
            <ThemedText style={styles.collapseButton}>
              {' '}[{showReplies ? '−' : `+${comment.kids.length}`}]
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
      {showReplies && (
        <>
          <ThemedText style={styles.commentText}>
            {parseHTMLWithLinks(comment.text)?.map((part, index) => {
              if (part.type === 'link') {
                return (
                  <ThemedText
                    key={index}
                    style={{ color: tintColor }}
                    onPress={() => part.url && WebBrowser.openBrowserAsync(part.url)}
                  >
                    {part.content}
                  </ThemedText>
                );
              }
              return <ThemedText key={index}>{part.content}</ThemedText>;
            })}
          </ThemedText>
          {comment.kids && comment.kids.length > 0 && (
            <View style={styles.replies}>
              {comment.kids.map((kidId) => (
                <Comment key={kidId} commentId={kidId} />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const [story, setStory] = useState<HNItem | null>(null);
  const [loading, setLoading] = useState(true);

  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');

  const { bottom } = useSafeAreaInsets();

  useEffect(() => {
    if (id) {
      getItem(Number(id))
        .then(setStory)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const timeAgo = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const openURL = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Loading...', headerShown: true, headerTransparent: true }} />
        <ThemedView style={styles.centered}>
          <ActivityIndicator size="large" color={textColor} />
        </ThemedView>
      </>
    );
  }

  if (!story) {
    return (
      <>
        <Stack.Screen options={{ title: 'Not Found', headerShown: true, headerTransparent: true }} />
        <ThemedView style={styles.centered}>
          <ThemedText>Story not found</ThemedText>
        </ThemedView>
      </>
    );
  }

  const parseHTMLWithLinks = (html?: string) => {
    if (!html) return null;

    const decodeEntities = (text: string) =>
      text
        .replace(/&#x2F;/g, '/')
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&');

    // Replace paragraph tags with newlines
    let processed = html
      .replace(/<p>/g, '\n\n')
      .replace(/<\/p>/g, '')
      .replace(/<i>/g, '')
      .replace(/<\/i>/g, '');

    // Match <a href="url">text</a> patterns
    const linkRegex = /<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/g;
    const parts: Array<{ type: 'text' | 'link'; content: string; url?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(processed)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        const textBefore = decodeEntities(processed.substring(lastIndex, match.index));
        if (textBefore) {
          parts.push({ type: 'text', content: textBefore });
        }
      }

      // Add the link
      parts.push({
        type: 'link',
        content: decodeEntities(match[2]),
        url: decodeEntities(match[1]),
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < processed.length) {
      const textAfter = decodeEntities(processed.substring(lastIndex));
      if (textAfter) {
        parts.push({ type: 'text', content: textAfter });
      }
    }

    return parts;
  };

  return (
    <>
      <Stack.Screen options={{ title: story.title || 'Story', headerTransparent: true }} />
      <ThemedView style={styles.container}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: Platform.select({ android: 100 + bottom, default: 0 }), }}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{story.title}</ThemedText>
            <View style={styles.metadata}>
              <ThemedText style={styles.metadataText}>
                {story.score} points by {story.by}
              </ThemedText>
              <ThemedText style={styles.metadataText}> • </ThemedText>
              <ThemedText style={styles.metadataText}>
                {timeAgo(story.time || 0)}
              </ThemedText>
              {story.descendants !== undefined && (
                <>
                  <ThemedText style={styles.metadataText}> • </ThemedText>
                  <ThemedText style={styles.metadataText}>
                    {story.descendants} comments
                  </ThemedText>
                </>
              )}
            </View>
            {story.url && (
              <TouchableOpacity onPress={() => openURL(story.url!)}>
                <ThemedText style={[styles.url, { color: tintColor }]}>
                  {story.url}
                </ThemedText>
              </TouchableOpacity>
            )}
            {story.text && (
              <ThemedText style={styles.storyText}>
                {parseHTMLWithLinks(story.text)?.map((part, index) => {
                  if (part.type === 'link') {
                    return (
                      <ThemedText
                        key={index}
                        style={{ color: tintColor }}
                        onPress={() => part.url && openURL(part.url)}
                      >
                        {part.content}
                      </ThemedText>
                    );
                  }
                  return <ThemedText key={index}>{part.content}</ThemedText>;
                })}
              </ThemedText>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          <View style={styles.commentsContainer}>
            {story.kids && story.kids.length > 0 ? (
              story.kids.map((commentId) => (
                <Comment key={commentId} commentId={commentId} />
              ))
            ) : (
              <View style={styles.centered}>
                <ThemedText style={styles.noComments}>No comments yet</ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 13,
    opacity: 0.5,
  },
  url: {
    fontSize: 14,
    marginBottom: 12,
  },
  storyText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  divider: {
    height: 4,
  },
  commentsContainer: {
    padding: 16,
  },
  comment: {
    marginBottom: 16,
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentTime: {
    fontSize: 12,
    opacity: 0.5,
  },
  collapseButton: {
    fontSize: 12,
    opacity: 0.5,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  replies: {
    marginTop: 8,
  },
  noComments: {
    opacity: 0.5,
    marginTop: 32,
  },
});
