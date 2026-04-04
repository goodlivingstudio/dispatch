// Figma Push API — creates color variables in a Figma file
// Called from the palette trends panel to push palettes directly

export async function POST(req: Request) {
  const figmaToken = process.env.FIGMA_ACCESS_TOKEN
  if (!figmaToken) {
    return Response.json({ error: "FIGMA_ACCESS_TOKEN not configured" }, { status: 500 })
  }

  try {
    const { fileKey, paletteName, colors } = await req.json() as {
      fileKey: string
      paletteName: string
      colors: { light: string; dark: string }[]
    }

    if (!fileKey || !paletteName || !colors?.length) {
      return Response.json({ error: "Missing fileKey, paletteName, or colors" }, { status: 400 })
    }

    const API = "https://api.figma.com/v1"
    const headers = {
      "X-Figma-Token": figmaToken,
      "Content-Type": "application/json",
    }

    // Step 1: Get existing variable collections to check if palette exists
    const collectionsRes = await fetch(`${API}/files/${fileKey}/variables/local`, { headers })
    if (!collectionsRes.ok) {
      const err = await collectionsRes.text()
      return Response.json({ error: `Figma API error: ${collectionsRes.status} ${err.slice(0, 200)}` }, { status: 500 })
    }
    const collectionsData = await collectionsRes.json()

    // Find existing collection or prepare to create new one
    const existingCollection = Object.values(collectionsData.meta?.variableCollections || {}).find(
      (c: unknown) => (c as { name: string }).name === `Dispatch — ${paletteName}`
    ) as { id: string; modes: { modeId: string; name: string }[] } | undefined

    // Step 2: Build the variable creation/update payload
    const actions: unknown[] = []

    if (existingCollection) {
      // Update existing variables
      const existingVars = Object.values(collectionsData.meta?.variables || {}).filter(
        (v: unknown) => (v as { variableCollectionId: string }).variableCollectionId === existingCollection.id
      ) as { id: string; name: string }[]

      const lightModeId = existingCollection.modes.find(m => m.name === "Light")?.modeId || existingCollection.modes[0]?.modeId
      const darkModeId = existingCollection.modes.find(m => m.name === "Dark")?.modeId || existingCollection.modes[1]?.modeId

      for (let i = 0; i < colors.length; i++) {
        const varName = `${paletteName.toLowerCase()}/${i + 1}`
        const existingVar = existingVars.find(v => v.name === varName)
        const lightRgb = hexToFigmaColor(colors[i].light)
        const darkRgb = hexToFigmaColor(colors[i].dark)

        if (existingVar) {
          // Update
          actions.push({
            action: "UPDATE_VARIABLE",
            id: existingVar.id,
            variableCollectionId: existingCollection.id,
            ...(lightModeId ? { valueModeId: lightModeId, value: lightRgb } : {}),
          })
          if (darkModeId) {
            actions.push({
              action: "UPDATE_VARIABLE",
              id: existingVar.id,
              variableCollectionId: existingCollection.id,
              valueModeId: darkModeId,
              value: darkRgb,
            })
          }
        }
      }
    } else {
      // Create new collection with modes and variables
      const tempCollectionId = "temp_collection"
      actions.push({
        action: "CREATE_VARIABLE_COLLECTION",
        id: tempCollectionId,
        name: `Dispatch — ${paletteName}`,
        initialModeId: "mode_light",
      })
      actions.push({
        action: "UPDATE_VARIABLE_COLLECTION_MODE",
        variableCollectionId: tempCollectionId,
        modeId: "mode_light",
        name: "Light",
      })
      actions.push({
        action: "CREATE_VARIABLE_COLLECTION_MODE",
        variableCollectionId: tempCollectionId,
        id: "mode_dark",
        name: "Dark",
      })

      for (let i = 0; i < colors.length; i++) {
        const varId = `temp_var_${i}`
        actions.push({
          action: "CREATE_VARIABLE",
          id: varId,
          name: `${paletteName.toLowerCase()}/${i + 1}`,
          variableCollectionId: tempCollectionId,
          resolvedDataType: "COLOR",
        })
        actions.push({
          action: "SET_VARIABLE_MODE_VALUE",
          variableId: varId,
          modeId: "mode_light",
          value: hexToFigmaColor(colors[i].light),
        })
        actions.push({
          action: "SET_VARIABLE_MODE_VALUE",
          variableId: varId,
          modeId: "mode_dark",
          value: hexToFigmaColor(colors[i].dark),
        })
      }
    }

    // Step 3: Execute
    const pushRes = await fetch(`${API}/files/${fileKey}/variables`, {
      method: "POST",
      headers,
      body: JSON.stringify(existingCollection
        ? { variableModeValues: actions }
        : { variableCollections: actions.filter(a => (a as {action:string}).action.includes("COLLECTION")), variableModes: actions.filter(a => (a as {action:string}).action.includes("MODE") && !(a as {action:string}).action.includes("COLLECTION")), variables: actions.filter(a => (a as {action:string}).action === "CREATE_VARIABLE"), variableModeValues: actions.filter(a => (a as {action:string}).action === "SET_VARIABLE_MODE_VALUE") }
      ),
    })

    if (!pushRes.ok) {
      const err = await pushRes.text()
      return Response.json({ error: `Push failed: ${pushRes.status} ${err.slice(0, 300)}` }, { status: 500 })
    }

    return Response.json({
      success: true,
      palette: paletteName,
      colors: colors.length,
      message: `${paletteName} palette pushed to Figma with Light + Dark modes`,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// Convert hex to Figma RGBA (0-1 range)
function hexToFigmaColor(hex: string): { r: number; g: number; b: number; a: number } {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return { r: 0, g: 0, b: 0, a: 1 }
  return {
    r: parseInt(m[1], 16) / 255,
    g: parseInt(m[2], 16) / 255,
    b: parseInt(m[3], 16) / 255,
    a: 1,
  }
}
