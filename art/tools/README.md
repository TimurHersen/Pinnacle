How the reskinned climbers were made (PixelLab, through its MCP endpoint; the key is added by the network proxy, never stored here).

- ed.py: submit one PixelLab image job (edit_image / transfer_outfit), wait, save the frames.
- runall2.py: redraw every frame of a base climber (assets/climbers/lumberjack or woman), 4 frames a call, padded to 128 px
  and cropped back, from a text description (art/reference/*-description.json); finished batches are skipped on a rerun.
  Run it from a working folder that has ed.py and nc/<description>.json.
- redhair.py: push strong orange hair toward red (used on Ember's first pass).
- sheet.py: lay frames side by side to compare them.
