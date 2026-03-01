import React, { useMemo } from 'react'
import { View, Dimensions, StyleSheet } from 'react-native'
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G } from 'react-native-svg'
import Animated, {
    useAnimatedProps,
    useSharedValue,
    withTiming,
    Easing
} from 'react-native-reanimated'
import { T } from '../../lib/theme'
import { CVText } from './CVText'

const { width: SCREEN_W } = Dimensions.get('window')
const AnimatedPath = Animated.createAnimatedComponent(Path)

interface DataPoint {
    label: string
    value: number
}

interface CVAnalyticsChartProps {
    data: DataPoint[]
    height?: number
    color?: string
    showLabels?: boolean
}

export const CVAnalyticsChart: React.FC<CVAnalyticsChartProps> = ({
    data,
    height = 180,
    color = T.color.brand.primary,
    showLabels = true
}) => {
    const padding = 20
    const chartW = SCREEN_W - T.spacing[8]
    const chartH = height - padding * 2

    const progress = useSharedValue(0)

    React.useEffect(() => {
        progress.value = withTiming(1, {
            duration: 1000,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1)
        })
    }, [])

    const { areaPath, linePath, points } = useMemo(() => {
        if (!data.length) return { areaPath: '', linePath: '', points: [] }

        const maxVal = Math.max(...data.map(d => d.value), 1)
        const stepX = chartW / (data.length - 1)

        const mappedPoints = data.map((d, i) => ({
            x: i * stepX,
            y: chartH - (d.value / maxVal) * chartH + padding
        }))

        // Smooth curve calculation (simple Bézier)
        let path = `M ${mappedPoints[0].x} ${mappedPoints[0].y}`
        for (let i = 0; i < mappedPoints.length - 1; i++) {
            const current = mappedPoints[i]
            const next = mappedPoints[i + 1]
            const cpX = (current.x + next.x) / 2
            path += ` C ${cpX} ${current.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`
        }

        const area = `${path} L ${mappedPoints[mappedPoints.length - 1].x} ${chartH + padding} L 0 ${chartH + padding} Z`

        return { areaPath: area, linePath: path, points: mappedPoints }
    }, [data, chartW, chartH])

    const animatedAreaProps = useAnimatedProps(() => ({
        opacity: progress.value
    }))

    return (
        <View style={styles.container}>
            <Svg width={chartW} height={height}>
                <Defs>
                    <LinearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={color} stopOpacity="0.3" />
                        <Stop offset="1" stopColor={color} stopOpacity="0" />
                    </LinearGradient>
                </Defs>

                <AnimatedPath
                    d={areaPath}
                    fill="url(#fillGrad)"
                    animatedProps={animatedAreaProps}
                />

                <AnimatedPath
                    d={linePath}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    animatedProps={animatedAreaProps}
                />

                {points.map((p, i) => (
                    <G key={i}>
                        <Circle
                            cx={p.x}
                            cy={p.y}
                            r="4"
                            fill={T.color.bg.primary}
                            stroke={color}
                            strokeWidth="2"
                        />
                    </G>
                ))}
            </Svg>

            {showLabels && (
                <View style={styles.labelContainer}>
                    {data.map((d, i) => (
                        <CVText key={i} preset="caption" color="secondary" style={{ width: chartW / data.length, textAlign: 'center' }}>
                            {d.label}
                        </CVText>
                    ))}
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        alignItems: 'center',
    },
    labelContainer: {
        flexDirection: 'row',
        width: '100%',
        marginTop: T.spacing[2],
        justifyContent: 'space-between'
    }
})
