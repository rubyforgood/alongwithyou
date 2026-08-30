require "test_helper"

class AdminControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get admin_url
    assert_response :success
  end

  # The landing page is generated from ApplicationHelper#admin_sections, so
  # this fails if a section is added to the list without a working path helper.
  test "index links to every admin section" do
    get admin_url

    assert_select "a[href=?]", medications_path
    assert_select "a[href=?]", medication_types_path
    assert_select "a[href=?]", medication_forms_path
  end

  # The point of the exercise: the reference-data sections are behind the one
  # Admin link, not sitting in the main nav beside People and Prescriptions.
  test "main nav carries a single admin link" do
    get root_url

    assert_select "nav.site-nav a[href=?]", admin_path
    assert_select "nav.site-nav a[href=?]", medications_path, count: 0
    assert_select "nav.admin-nav", count: 0
  end

  # The sub-nav is what makes /medications read as part of the admin area
  # rather than another top-level section, so it has to follow you into one.
  test "admin sub-nav shows inside an admin section" do
    get medications_url

    assert_select "nav.admin-nav a[href=?][aria-current=page]", medications_path
    assert_select "nav.site-nav a[href=?][aria-current=page]", admin_path
  end

  test "admin sub-nav stays hidden outside the admin area" do
    get people_url

    assert_select "nav.admin-nav", count: 0
  end
end
