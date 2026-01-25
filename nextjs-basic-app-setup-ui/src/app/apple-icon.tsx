import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Image generation for Apple devices
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #3b82f6 0%, #22c55e 50%, #10b981 100%)',
          borderRadius: '40px',
          position: 'relative',
        }}
      >
        {/* Outer circle */}
        <div
          style={{
            position: 'absolute',
            width: '140px',
            height: '140px',
            border: '4px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '50%',
          }}
        />
        {/* Middle circle */}
        <div
          style={{
            position: 'absolute',
            width: '100px',
            height: '100px',
            border: '4px solid rgba(255, 255, 255, 0.6)',
            borderRadius: '50%',
          }}
        />
        {/* Inner circle */}
        <div
          style={{
            position: 'absolute',
            width: '60px',
            height: '60px',
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '50%',
          }}
        />
        {/* Center dot */}
        <div
          style={{
            position: 'absolute',
            width: '30px',
            height: '30px',
            background: 'linear-gradient(135deg, #2563eb 0%, #16a34a 100%)',
            borderRadius: '50%',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
