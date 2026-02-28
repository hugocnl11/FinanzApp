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
          background: 'linear-gradient(135deg, #0a0a0a 0%, #171717 50%, #000000 100%)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '24px',
            height: '24px',
            border: '2px solid rgba(255, 255, 255, 0.35)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #171717 50%, #000000 100%)',
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
