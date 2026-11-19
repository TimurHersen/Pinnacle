How the reskinned climbers were made (PixelLab, through its MCP endpoint; the key is added by the network proxy, never stored here).

- ed.py: submit one PixelLab image job (edit_image / transfer_outfit), wait, save the frames.
- runall2.py: redraw every frame of a base climber (assets/climbers/lumberjack or woman), 4 frames a call, padded to 128 px
  and cropped back, from a text description (art/reference/*-description.json); finished batches are skipped on a rerun.
  Run it from a working folder that has ed.py and nc/<description>.json.
- redhair.py: push strong orange hair toward red (used on Ember's first pass).
- sheet.py: lay frames side by side to compare them.

PixelLab characters (reusable for new animations):
- Juniper (the explorer): a9591d82-ffd4-4e19-b110-939cdbea04b4
- Ember: b50ecbb2-5b6b-4a47-b3a6-3cbbb423de35 (a state of Juniper; its south view is art/reference/ember-ref.png)
- Birch (the lumberjack): 61243147-bdd1-49c3-9111-0b93fccce6b5
Ember's frames were redrawn from art/reference/ember-ref.png with transfer_outfit (runall3.py); Onyx's from the text
in art/reference/onyx-description.json with edit_image (runall2.py).
