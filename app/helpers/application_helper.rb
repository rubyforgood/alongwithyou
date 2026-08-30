module ApplicationHelper
  # True when the request is anywhere inside a section, not only on its index.
  # current_page? matches the whole path, so it drops the active state the
  # moment you open /people/1 or /people/new - which is exactly when knowing
  # where you are matters most. The trailing slash keeps /medications from
  # claiming /medication_types.
  def section_current?(path)
    request.path == path || request.path.start_with?("#{path}/")
  end

  # An empty table cell reads as a rendering fault. An em dash reads as "nobody
  # recorded this", which is what a blank optional field actually means.
  def or_dash(value)
    value.presence || "—"
  end

  # The value aria-current wants, or nil to leave the attribute off entirely.
  # link_to drops an aria value of nil rather than rendering aria-current="".
  def aria_current_section(path)
    "page" if section_current?(path)
  end

  # The sections that maintain reference data rather than a person's own
  # records. Nobody using the app day to day adds a medication or invents a new
  # dosage form; someone setting the app up does, once.
  #
  # This is the only list of them. The header's Admin link, the sub-nav under
  # it and the cards on /admin all read from here, so a fourth lookup table
  # gets added in one place and cannot appear in two of the three.
  def admin_sections
    [
      { name: "Medications",
        path: medications_path,
        description: "The catalogue of drugs a prescription can point at, " \
                     "with the side effects to warn about." },
      { name: "Medication types",
        path: medication_types_path,
        description: "How medications are grouped - the categories offered " \
                     "when adding one." },
      { name: "Medication forms",
        path: medication_forms_path,
        description: "How a medication is taken: tablet, capsule, liquid, " \
                     "patch, and the rest." }
    ]
  end

  # True anywhere in the administrative area: its landing page, or inside any
  # section the landing page lists. Those sections keep their own top-level
  # paths, so there is no /admin prefix to match on - the list is the test.
  def admin_area?
    section_current?(admin_path) ||
      admin_sections.any? { |section| section_current?(section[:path]) }
  end
end
