import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
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
          borderRadius: '8px',
          position: 'relative',
        }}
      >
        {/* Outer circle */}
        <div
          style={{
            position: 'absolute',
            width: '24px',
            height: '24px',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '50%',
          }}
        />
        {/* Middle circle */}
        <div
          style={{
            position: 'absolute',
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255, 255, 255, 0.6)',
            borderRadius: '50%',
          }}
        />
        {/* Inner circle */}
        <div
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '50%',
          }}
        />
        {/* Center dot */}
        <div
          style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
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
