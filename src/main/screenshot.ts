import { desktopCapturer, screen } from 'electron'

export interface CapturedScreen {
  dataUrl: string
  display: Electron.Display
}

export async function captureAllScreens(): Promise<CapturedScreen[]> {
  const displays = screen.getAllDisplays()
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.max(...displays.map((d) => d.size.width * d.scaleFactor)),
      height: Math.max(...displays.map((d) => d.size.height * d.scaleFactor))
    }
  })

  return displays.map((display) => {
    const source = sources.find((s) => s.display_id === display.id.toString()) || sources[0]
    return {
      dataUrl: source.thumbnail.toDataURL(),
      display
    }
  })
}
