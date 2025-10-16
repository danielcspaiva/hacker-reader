import { useThemeColor } from '@/hooks/use-theme-color';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

export default function TabLayout() {
  return (
    <NativeTabs iconColor={useThemeColor({}, 'tint')}>
      <NativeTabs.Trigger name="top">
        <Icon sf="flame.fill" />
        <Label>Top</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="new">
        <Icon sf="clock.fill" />
        <Label>New</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ask">
        <Icon sf="questionmark.circle.fill" />
        <Label>Ask</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="show">
        <Icon sf="eye.fill" />
        <Label>Show</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="jobs">
        <Icon sf="briefcase.fill" />
        <Label>Jobs</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
