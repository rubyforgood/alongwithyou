module PrescriptionsHelper
  # Two lines in one column rather than two columns. Most prescriptions have a
  # start and no stop, so a Stopped column would be a mostly empty stripe down
  # the log.
  def prescription_started(prescription)
    prescription_date(prescription.start_date) || "—"
  end

  # What has happened since it started. Every combination of active and
  # stop_date says something, and all four say it out loud: a blank line under
  # a Stopped badge is indistinguishable from a column that failed to render.
  def prescription_stopped(prescription)
    stopped = prescription_date(prescription.stop_date)

    if prescription.active?
      stopped ? "until #{stopped}" : "ongoing"
    else
      stopped ? "stopped #{stopped}" : "no stop date recorded"
    end
  end

  # The word carries the meaning; the colour only agrees with it. A boolean
  # printed raw ("true") is the one thing a caregiver scanning this cannot read
  # at a glance.
  def prescription_status(prescription)
    if prescription.active?
      tag.span "Active", class: "status status--active"
    else
      tag.span "Stopped", class: "status status--stopped"
    end
  end

  # "Aug 1, 2026". Short enough to keep a log column narrow, spelled enough to
  # sidestep the 8/1 vs 1/8 question.
  def prescription_date(date)
    date&.strftime("%b %-d, %Y")
  end
end
