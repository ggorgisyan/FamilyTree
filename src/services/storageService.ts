function compressImageToDataUrl(file: File, maxSize = 700, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const image = new Image()

      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not prepare image for upload.'))
          return
        }

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }

      image.onerror = () => reject(new Error('Could not read the selected image file.'))
      image.src = String(reader.result)
    }

    reader.onerror = () => reject(new Error('Could not read the selected image file.'))
    reader.readAsDataURL(file)
  })
}

export async function uploadMemberPhoto(_memberId: string, file: File): Promise<string> {
  return compressImageToDataUrl(file)
}
