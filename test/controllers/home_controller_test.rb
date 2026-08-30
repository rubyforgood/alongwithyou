require "test_helper"

class HomeControllerTest < ActionDispatch::IntegrationTest
  # For the signed-in case below. There is no users fixture and no global
  # Devise test setup yet, so this class brings its own.
  include Devise::Test::IntegrationHelpers

  test "should get index" do
    get root_url
    assert_response :success
  end

  test "index speaks to visitors" do
    get root_url

    assert_select "h1", /No one faces a medical journey/
    assert_select "a[href='https://www.alongwithyou.org']"
  end

  test "index does not repeat the header's account links" do
    get root_url

    assert_select ".site-main a[href=?]", new_user_session_path, count: 0
    assert_select ".site-main a[href=?]", destroy_user_session_path, count: 0
  end

  test "index offers a visitor an account" do
    get root_url
    assert_select ".hero a[href=?]", new_user_registration_path, text: "Create an account"
  end

  test "index does not offer an account to someone who has one" do
    sign_in User.create!(email: "signed-in@example.com", password: "password",
                         confirmed_at: Time.current)

    get root_url
    assert_select ".hero a[href=?]", new_user_registration_path, count: 0
  end

  test "index hides the horse" do
    get root_url
    assert_select "img[src*=?]", "horse", count: 0
  end

  test "index shows the horse to anyone who asks for a stampede" do
    get root_url(stampede: "")
    assert_select "img[src*=?]", "horse"
  end

  # A bare ?stampede - no equals sign, no value - parses to a nil value, so the
  # view has to ask whether the key is there rather than what it says.
  test "index shows the horse for a valueless stampede" do
    get "/?stampede"
    assert_select "img[src*=?]", "horse"
  end
end
