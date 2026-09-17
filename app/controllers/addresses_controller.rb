class AddressesController < ApplicationController
  before_action :set_person
  before_action :set_address, only: %i[ show update destroy ]

  def show
  end

  def create
    @address = @person.build_address(address_params)

    respond_to do |format|
      if @address.save
        format.html { redirect_to person_address_url(@person), notice: "Address was successfully created." }
        format.json { render :show, status: :created, location: person_address_url(@person) }
      else
        format.html { render :new, status: :unprocessable_content }
        format.json { render json: @address.errors, status: :unprocessable_content }
      end
    end
  end

  def update
    respond_to do |format|
      if @address.update(address_params)
        format.html { redirect_to person_address_url(@person), notice: "Address was successfully updated.", status: :see_other }
        format.json { render :show, status: :ok, location: person_address_url(@person) }
      else
        format.html { render :edit, status: :unprocessable_content }
        format.json { render json: @address.errors, status: :unprocessable_content }
      end
    end
  end

  def destroy
    @address.destroy!

    respond_to do |format|
      format.html { redirect_to person_url(@person), notice: "Address was successfully destroyed.", status: :see_other }
      format.json { head :no_content }
    end
  end

  private

  def set_person
    @person = Person.find(params[:person_id])
  end

  # A person has at most one address, and may have none yet: show, update and
  # destroy on a person without one are a 404, not a nil blowing up in the
  # action.
  def set_address
    @address = @person.address || raise(ActiveRecord::RecordNotFound.new("Person #{@person.id} has no address", "Address"))
  end

  def address_params
    params.expect(address: [ :city, :state ])
  end
end
