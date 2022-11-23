import {
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetModalProvider,
  useBottomSheetDynamicSnapPoints,
} from '@gorhom/bottom-sheet';
import {
  NavigationState,
  ParamListBase,
  useTheme,
} from '@react-navigation/native';
import * as React from 'react';
import { createContext, useMemo } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type {
  BottomSheetDescriptorMap,
  BottomSheetNavigationConfig,
  BottomSheetNavigationHelpers,
  BottomSheetNavigationProp,
  BottomSheetNavigationState,
} from './types';

type BottomSheetModalScreenProps = BottomSheetModalProps & {
  navigation: BottomSheetNavigationProp<ParamListBase>;
};

export const NavigationContextBottomsheet = createContext<{
  handleContentLayout?: (event: LayoutChangeEvent) => void;
}>({});

function BottomSheetModalScreen({
  navigation,
  index,
  ...props
}: BottomSheetModalScreenProps) {
  const ref = React.useRef<BottomSheetModal>(null);
  const lastIndexRef = React.useRef(index);

  // Present on mount.
  React.useEffect(() => {
    ref.current?.present();
  }, []);

  const isMounted = React.useRef(true);
  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (index != null && lastIndexRef.current !== index) {
      ref.current?.snapToIndex(index);
    }
  }, [index]);

  const onChange = React.useCallback(
    (newIndex: number) => {
      lastIndexRef.current = newIndex;
      if (newIndex >= 0) {
        navigation.snapTo(newIndex);
      }
    },
    [navigation],
  );

  const onDismiss = React.useCallback(() => {
    // BottomSheetModal will call onDismiss on unmount, be we do not want that since
    // we already popped the screen.
    if (isMounted.current) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <BottomSheetModal
      ref={ref}
      index={index}
      onChange={onChange}
      onDismiss={onDismiss}
      {...props}
    />
  );
}

const DEFAULT_SNAP_POINTS = ['66%'];

const BottomSheetRouterScreen = ({
  descriptors,
  route,
}: {
  descriptors: BottomSheetDescriptorMap;
  route: NavigationState<ParamListBase>['routes'][number] & {
    snapToIndex?: number | null;
  };
}) => {
  const { colors } = useTheme();

  const themeBackgroundStyle = React.useMemo(
    () => ({
      backgroundColor: colors.card,
    }),
    [colors.card],
  );
  const themeHandleIndicatorStyle = React.useMemo(
    () => ({
      backgroundColor: colors.border,
    }),
    [colors.border],
  );

  const initialSnapPoints = useMemo(() => ['CONTENT_HEIGHT'], []);

  const {
    animatedHandleHeight,
    animatedSnapPoints,
    animatedContentHeight,
    handleContentLayout,
  } = useBottomSheetDynamicSnapPoints(initialSnapPoints);

  const { options, navigation, render } = descriptors[route.key];

  const {
    index,
    backgroundStyle,
    handleIndicatorStyle,
    snapPoints = DEFAULT_SNAP_POINTS,
    ...sheetProps
  } = options;

  return (
    <BottomSheetModalScreen
      key={route.key}
      // Make sure index is in range, it could be out if snapToIndex is persisted
      // and snapPoints is changed.
      index={Math.min(route.snapToIndex ?? index ?? 0, snapPoints.length - 1)}
      // snapPoints={snapPoints}
      snapPoints={animatedSnapPoints}
      handleHeight={animatedHandleHeight}
      contentHeight={animatedContentHeight}
      navigation={navigation}
      backgroundStyle={[themeBackgroundStyle, backgroundStyle]}
      handleIndicatorStyle={[themeHandleIndicatorStyle, handleIndicatorStyle]}
      {...sheetProps}
    >
      <NavigationContextBottomsheet.Provider value={{ handleContentLayout }}>
        {render()}
      </NavigationContextBottomsheet.Provider>
    </BottomSheetModalScreen>
  );
};

type Props = BottomSheetNavigationConfig & {
  state: BottomSheetNavigationState<ParamListBase>;
  navigation: BottomSheetNavigationHelpers;
  descriptors: BottomSheetDescriptorMap;
};

export function BottomSheetView({ state, descriptors }: Props) {
  // Avoid rendering provider if we only have one screen.

  return (
    <>
      <BottomSheetModalProvider>
        {state.routes.map((route) => {
          return (
            <BottomSheetRouterScreen route={route} descriptors={descriptors} />
          );
        })}
      </BottomSheetModalProvider>
    </>
  );
}
