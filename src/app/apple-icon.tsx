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
          background: 'linear-gradient(135deg, #0a0a0a 0%, #171717 50%, #000000 100%)',
          borderRadius: '40px',
          border: '4px solid rgba(255, 255, 255, 0.25)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '140px',
            height: '140px',
            border: '4px solid rgba(255, 255, 255, 0.35)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '100px',
            height: '100px',
            border: '4px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '60px',
            height: '60px',
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '30px',
            height: '30px',
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
